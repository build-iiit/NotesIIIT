/**
 * Reports Router
 *
 * Handles abuse reporting system for notes, comments, users, and pages.
 * Supports report submission, queue management, and resolution.
 */

import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    moderatorProcedure,
    adminProcedure,
} from "@/server/api/trpc";
import {
    ReportTargetType,
    ReportReason,
    ReportStatus,
    AuditCategory,
} from "@prisma/client";

export const reportsRouter = createTRPCRouter({
    // =========================================================================
    // User-Facing Endpoints
    // =========================================================================

    /**
     * Submit a new report
     * Auth: Any authenticated user
     */
    create: protectedProcedure
        .input(
            z.object({
                targetType: z.nativeEnum(ReportTargetType),
                targetId: z.string(),
                reason: z.nativeEnum(ReportReason),
                description: z.string().max(1000).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user already reported this target
            const existing = await ctx.prisma.report.findFirst({
                where: {
                    reporterId: ctx.session.user.id,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    status: { in: ["PENDING", "UNDER_REVIEW"] },
                },
            });

            if (existing) {
                throw new Error("You have already reported this content");
            }

            // Validate target exists
            const targetExists = await validateTarget(
                ctx.prisma,
                input.targetType,
                input.targetId
            );
            if (!targetExists) {
                throw new Error("The reported content does not exist");
            }

            const report = await ctx.prisma.report.create({
                data: {
                    reporterId: ctx.session.user.id,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    reason: input.reason,
                    description: input.description,
                },
            });

            return { id: report.id, status: report.status };
        }),

    /**
     * Get user's own reports
     * Auth: Any authenticated user
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

            const reports = await ctx.prisma.report.findMany({
                where: { reporterId: ctx.session.user.id },
                take: limit + 1,
                cursor: input?.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    targetType: true,
                    targetId: true,
                    reason: true,
                    status: true,
                    resolution: true,
                    createdAt: true,
                    resolvedAt: true,
                },
            });

            let nextCursor: string | undefined;
            if (reports.length > limit) {
                const nextItem = reports.pop();
                nextCursor = nextItem!.id;
            }

            return { reports, nextCursor };
        }),

    // =========================================================================
    // Admin/Moderator Endpoints
    // =========================================================================

    /**
     * Get report queue with filters
     * Auth: Moderator+
     */
    getQueue: moderatorProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(),
                status: z.nativeEnum(ReportStatus).optional(),
                targetType: z.nativeEnum(ReportTargetType).optional(),
                reason: z.nativeEnum(ReportReason).optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;

            interface WhereClause {
                status?: ReportStatus;
                targetType?: ReportTargetType;
                reason?: ReportReason;
            }
            const where: WhereClause = {};

            if (input?.status) where.status = input.status;
            if (input?.targetType) where.targetType = input.targetType;
            if (input?.reason) where.reason = input.reason;

            const reports = await ctx.prisma.report.findMany({
                where,
                take: limit + 1,
                cursor: input?.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "asc" }, // Oldest first (FIFO queue)
                include: {
                    reporter: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                    resolver: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (reports.length > limit) {
                const nextItem = reports.pop();
                nextCursor = nextItem!.id;
            }

            // Get counts by status
            const statusCounts = await ctx.prisma.report.groupBy({
                by: ["status"],
                _count: { status: true },
            });

            return {
                reports,
                nextCursor,
                counts: {
                    pending: statusCounts.find((s) => s.status === "PENDING")?._count.status || 0,
                    underReview: statusCounts.find((s) => s.status === "UNDER_REVIEW")?._count.status || 0,
                    resolved: statusCounts.find((s) => s.status === "RESOLVED")?._count.status || 0,
                    dismissed: statusCounts.find((s) => s.status === "DISMISSED")?._count.status || 0,
                },
            };
        }),

    /**
     * Get single report with full details
     * Auth: Moderator+
     */
    getById: moderatorProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const report = await ctx.prisma.report.findUnique({
                where: { id: input.id },
                include: {
                    reporter: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                    resolver: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            if (!report) {
                throw new Error("Report not found");
            }

            // Fetch target details based on type
            let targetDetails: Record<string, unknown> | null = null;
            switch (report.targetType) {
                case "NOTE":
                    targetDetails = await ctx.prisma.note.findUnique({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            title: true,
                            authorId: true,
                            author: { select: { name: true, email: true } },
                            createdAt: true,
                        },
                    });
                    break;
                case "COMMENT":
                    targetDetails = await ctx.prisma.comment.findUnique({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            content: true,
                            userId: true,
                            user: { select: { name: true, email: true } },
                            createdAt: true,
                        },
                    });
                    break;
                case "USER":
                    targetDetails = await ctx.prisma.user.findUnique({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            createdAt: true,
                        },
                    });
                    break;
                case "PAGE":
                    targetDetails = await ctx.prisma.page.findUnique({
                        where: { id: report.targetId },
                        select: {
                            id: true,
                            number: true,
                            versionId: true,
                        },
                    });
                    break;
            }

            return { ...report, targetDetails };
        }),

    /**
     * Update report status (e.g., mark as under review)
     * Auth: Moderator+
     */
    updateStatus: moderatorProcedure
        .input(
            z.object({
                id: z.string(),
                status: z.nativeEnum(ReportStatus),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const report = await ctx.prisma.report.findUnique({
                where: { id: input.id },
            });

            if (!report) {
                throw new Error("Report not found");
            }

            const updated = await ctx.prisma.report.update({
                where: { id: input.id },
                data: { status: input.status },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "report.updateStatus",
                    category: AuditCategory.REPORTS,
                    targetType: "Report",
                    targetId: input.id,
                    beforeState: { status: report.status },
                    afterState: { status: input.status },
                },
            });

            return updated;
        }),

    /**
     * Resolve a report with an action
     * Auth: Moderator+
     */
    resolve: moderatorProcedure
        .input(
            z.object({
                id: z.string(),
                resolution: z.string().max(500),
                dismiss: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const report = await ctx.prisma.report.findUnique({
                where: { id: input.id },
            });

            if (!report) {
                throw new Error("Report not found");
            }

            const updated = await ctx.prisma.report.update({
                where: { id: input.id },
                data: {
                    status: input.dismiss ? "DISMISSED" : "RESOLVED",
                    resolvedAt: new Date(),
                    resolvedBy: ctx.session.user.id,
                    resolution: input.resolution,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: input.dismiss ? "report.dismiss" : "report.resolve",
                    category: AuditCategory.REPORTS,
                    targetType: "Report",
                    targetId: input.id,
                    beforeState: { status: report.status },
                    afterState: {
                        status: updated.status,
                        resolution: input.resolution,
                    },
                },
            });

            return updated;
        }),

    /**
     * Get repeat offenders (users with multiple reports against them)
     * Auth: Admin+
     */
    getRepeatOffenders: adminProcedure
        .input(
            z.object({
                minReports: z.number().min(2).default(3),
                limit: z.number().min(1).max(50).default(20),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const minReports = input?.minReports ?? 3;
            const limit = input?.limit ?? 20;

            // Get users reported as targets
            const offenders = await ctx.prisma.report.groupBy({
                by: ["targetId"],
                where: { targetType: "USER" },
                _count: { targetId: true },
                having: { targetId: { _count: { gte: minReports } } },
                orderBy: { _count: { targetId: "desc" } },
                take: limit,
            });

            // Fetch user details
            const userIds = offenders.map((o) => o.targetId);
            const users = await ctx.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    role: true,
                },
            });

            const userMap = new Map(users.map((u) => [u.id, u]));

            return offenders.map((o) => ({
                user: userMap.get(o.targetId),
                reportCount: o._count.targetId,
            }));
        }),

    /**
     * Get report statistics
     * Auth: Moderator+
     */
    getStats: moderatorProcedure.query(async ({ ctx }) => {
        const [
            totalReports,
            pendingReports,
            todayReports,
            byReason,
            byTargetType,
        ] = await Promise.all([
            ctx.prisma.report.count(),
            ctx.prisma.report.count({ where: { status: "PENDING" } }),
            ctx.prisma.report.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            ctx.prisma.report.groupBy({
                by: ["reason"],
                _count: { reason: true },
            }),
            ctx.prisma.report.groupBy({
                by: ["targetType"],
                _count: { targetType: true },
            }),
        ]);

        return {
            total: totalReports,
            pending: pendingReports,
            today: todayReports,
            byReason: byReason.map((r) => ({
                reason: r.reason,
                count: r._count.reason,
            })),
            byTargetType: byTargetType.map((t) => ({
                type: t.targetType,
                count: t._count.targetType,
            })),
        };
    }),
});

// Helper function to validate target exists
async function validateTarget(
    prisma: typeof import("@/lib/prisma").prisma,
    targetType: ReportTargetType,
    targetId: string
): Promise<boolean> {
    switch (targetType) {
        case "NOTE":
            return !!(await prisma.note.findUnique({ where: { id: targetId } }));
        case "COMMENT":
            return !!(await prisma.comment.findUnique({ where: { id: targetId } }));
        case "USER":
            return !!(await prisma.user.findUnique({ where: { id: targetId } }));
        case "PAGE":
            return !!(await prisma.page.findUnique({ where: { id: targetId } }));
        default:
            return false;
    }
}
