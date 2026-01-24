import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const notesRouter = createTRPCRouter({
    getAll: publicProcedure.query(async ({ ctx }) => {
        return ctx.prisma.note.findMany({
            include: {
                author: true,
                course: true
            },
            orderBy: { createdAt: "desc" },
        });
    }),

    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: {
                    author: true,
                    course: true,
                    versions: {
                        orderBy: { createdAt: "desc" },
                    },
                    comments: {
                        include: { user: true },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            if (!note) throw new TRPCError({ code: "NOT_FOUND" });

            return note;
        }),

    incrementView: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.note.update({
                where: { id: input.id },
                data: { viewCount: { increment: 1 } },
            });
            return { success: true };
        }),

    getInfinite: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.string().nullish(),
                search: z.string().optional(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
                sortBy: z.enum(["newest", "popular"]).default("newest"),
            })
        )
        .query(async ({ ctx, input }) => {
            const limit = input.limit;
            const { cursor, search, courseId, semester, sortBy } = input;

            const where = {
                AND: [
                    search
                        ? {
                            OR: [
                                { title: { contains: search, mode: "insensitive" as const } },
                                { description: { contains: search, mode: "insensitive" as const } },
                                { course: { name: { contains: search, mode: "insensitive" as const } } }, // Added course name search
                                { course: { code: { contains: search, mode: "insensitive" as const } } }, // Added course code search
                            ],
                        }
                        : {},
                    courseId ? { courseId } : {},
                    semester ? { semester } : {},
                ],
            };

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                where,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: sortBy === "newest"
                    ? { createdAt: "desc" }
                    : { voteScore: "desc" },
                include: {
                    author: true,
                    course: true,
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const itemsPop = items.pop();
                nextCursor = itemsPop?.id;
            }

            return {
                items,
                nextCursor,
            };
        }),

    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                s3Key: z.string(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.note.create({
                data: {
                    title: input.title,
                    description: input.description,
                    authorId: ctx.session.user.id,
                    courseId: input.courseId,
                    semester: input.semester,
                    versions: {
                        create: {
                            s3Key: input.s3Key,
                            version: 1,
                        }
                    }
                },
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string().min(1),
                description: z.string().optional(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
            });

            if (!note || note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.note.update({
                where: { id: input.id },
                data: {
                    title: input.title,
                    description: input.description,
                    courseId: input.courseId,
                    semester: input.semester,
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
            });

            if (!note || note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.note.delete({
                where: { id: input.id },
            });
        }),
});
