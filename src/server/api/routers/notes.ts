import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

export const notesRouter = createTRPCRouter({
    /**
     * List all notes with pagination and filtering.
     * Auth: Public
     */
    getAll: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(), // For infinite scroll
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;
            const search = input?.search;

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    isPublic: true,
                    AND: search ? {
                        OR: [
                            { title: { contains: search, mode: "insensitive" } },
                            { author: { name: { contains: search, mode: "insensitive" } } },
                        ]
                    } : undefined,
                },
                orderBy: { createdAt: "desc" },
                include: { author: true },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            return { items, nextCursor };
        }),

    /**
     * Get trending notes (most viewed).
     * Auth: Public
     */
    getTrending: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.note.findMany({
                take: 6,
                where: { isPublic: true },
                orderBy: { viewCount: "desc" },
                include: {
                    author: true,
                    versions: {
                        orderBy: { version: 'desc' },
                        take: 1
                    }
                },
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
                    versions: {
                        orderBy: { version: 'desc' },
                        take: 1
                    }
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
                // Added thumbnails to queries by including versions where needed or relying on frontend to fetch.
                // For list views, it's better to fetch just the needed version info.

                // create mutation update
                s3Key: z.string(),
                thumbnailKey: z.string().nullish(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
                folderId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.$transaction(async (tx) => {
                const note = await tx.note.create({
                    data: {
                        title: input.title,
                        description: input.description,
                        authorId: ctx.session.user.id,
                        courseId: input.courseId,
                        folderId: input.folderId ?? undefined,
                        semester: input.semester,
                        versions: {
                            create: {
                                s3Key: input.s3Key,
                                thumbnailKey: input.thumbnailKey,
                                version: 1,
                            }
                        }
                    },
                    include: { versions: true },
                });

                await tx.note.update({
                    where: { id: note.id },
                    data: { currentVersionId: note.versions[0].id },
                });

                return note;
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

    /**
     * Track a view on a note.
     * Auth: Public (both authenticated and anonymous users can view)
     */
    trackView: publicProcedure
        .input(z.object({ noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session?.user?.id;

            // Check if the note exists
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
            });

            if (!note) {
                throw new Error("Note not found");
            }

            // Only track if the viewer is not the author (to avoid self-inflation)
            if (userId && userId === note.authorId) {
                return { success: false, message: "Authors don't count views on their own notes" };
            }

            // Check if this user has already viewed this note recently (within last 24 hours)
            // to prevent spam from refreshes
            if (userId) {
                const recentView = await ctx.prisma.view.findFirst({
                    where: {
                        noteId: input.noteId,
                        userId: userId,
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                        },
                    },
                });

                if (recentView) {
                    return { success: false, message: "View already counted recently" };
                }
            }

            // Create a new view and increment the view count in a transaction
            await ctx.prisma.$transaction([
                ctx.prisma.view.create({
                    data: {
                        noteId: input.noteId,
                        userId: userId || null,
                    },
                }),
                ctx.prisma.note.update({
                    where: { id: input.noteId },
                    data: {
                        viewCount: {
                            increment: 1,
                        },
                    },
                }),
            ]);

            return { success: true, message: "View tracked successfully" };
        }),
});
