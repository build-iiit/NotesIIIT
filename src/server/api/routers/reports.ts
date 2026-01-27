import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Reports Router
 * Handles user-submitted content reports with abuse prevention
 */
export const reportsRouter = createTRPCRouter({
    /**
     * Create a new report
     * Includes abuse prevention: users with too many dismissed reports are limited
     */
    create: protectedProcedure
        .input(
            z.object({
                reason: z.enum(["SPAM", "INAPPROPRIATE", "HARMFUL", "WRONG_SUBJECT", "LOW_QUALITY", "DUPLICATE", "OTHER"]),
                description: z.string().optional(),
                // Target (only one should be provided)
                noteId: z.string().optional(),
                commentId: z.string().optional(),
                requestId: z.string().optional(),
                reportedUserId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const reporterId = ctx.session.user.id;

            // Validate that exactly one target is provided
            const targetCount = [input.noteId, input.commentId, input.requestId, input.reportedUserId].filter(Boolean).length;
            if (targetCount !== 1) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Exactly one target (note, comment, request, or user) must be specified",
                });
            }

            // ABUSE PREVENTION: Check if user has too many dismissed reports
            const recentDismissedCount = await ctx.prisma.report.count({
                where: {
                    reporterId,
                    status: "DISMISSED",
                    createdAt: {
                        // Check last 30 days
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            });

            // If user has 5+ dismissed reports in last 30 days, block them
            if (recentDismissedCount >= 5) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You have submitted too many invalid reports. Please contact an administrator if you believe this is an error.",
                });
            }

            // Prevent self-reporting
            if (input.reportedUserId === reporterId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You cannot report yourself",
                });
            }

            // Check if user already reported this content
            const existingReport = await ctx.prisma.report.findFirst({
                where: {
                    reporterId,
                    status: { in: ["PENDING", "REVIEWED"] },
                    ...(input.noteId && { noteId: input.noteId }),
                    ...(input.commentId && { commentId: input.commentId }),
                    ...(input.requestId && { requestId: input.requestId }),
                    ...(input.reportedUserId && { reportedUserId: input.reportedUserId }),
                },
            });

            if (existingReport) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You have already reported this content",
                });
            }

            // Create the report
            return ctx.prisma.report.create({
                data: {
                    reporterId,
                    reason: input.reason,
                    description: input.description,
                    noteId: input.noteId,
                    commentId: input.commentId,
                    requestId: input.requestId,
                    reportedUserId: input.reportedUserId,
                },
                include: {
                    reporter: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });
        }),

    /**
     * Get reports submitted by the current user
     */
    getMyReports: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(50).default(20),
                cursor: z.string().nullish(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;

            const reports = await ctx.prisma.report.findMany({
                where: { reporterId: ctx.session.user.id },
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: "desc" },
                include: {
                    note: { select: { id: true, title: true } },
                    comment: { select: { id: true, content: true } },
                    request: { select: { id: true, title: true } },
                    reportedUser: { select: { id: true, name: true } },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (reports.length > limit) {
                const nextItem = reports.pop();
                nextCursor = nextItem!.id;
            }

            return { reports, nextCursor };
        }),

    /**
     * Check if the current user has already reported specific content
     */
    checkIfReported: protectedProcedure
        .input(
            z.object({
                noteId: z.string().optional(),
                commentId: z.string().optional(),
                requestId: z.string().optional(),
                reportedUserId: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            // Validate that exactly one target is provided
            const targetCount = [input.noteId, input.commentId, input.requestId, input.reportedUserId].filter(Boolean).length;
            if (targetCount !== 1) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Exactly one target must be specified",
                });
            }

            const existingReport = await ctx.prisma.report.findFirst({
                where: {
                    reporterId: ctx.session.user.id,
                    status: { in: ["PENDING", "REVIEWED"] },
                    ...(input.noteId && { noteId: input.noteId }),
                    ...(input.commentId && { commentId: input.commentId }),
                    ...(input.requestId && { requestId: input.requestId }),
                    ...(input.reportedUserId && { reportedUserId: input.reportedUserId }),
                },
            });

            return { hasReported: !!existingReport };
        }),
});
