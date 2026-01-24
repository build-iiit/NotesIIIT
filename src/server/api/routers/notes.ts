import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

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
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: { isPublic: true },
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
     * Get a single note by ID with its current version.
     * Auth: Public
     */
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: { versions: true, author: true },
            });

            if (!note) return null;

            // Security Check
            const isAuthor = ctx.session?.user?.id === note.authorId;
            if (!note.isPublic && !isAuthor) {
                return null;
            }

            // Generate Signed URL
            let fileUrl = "";
            const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];

            if (currentVersion?.s3Key) {
                fileUrl = await getPresignedDownloadUrl(currentVersion.s3Key);
            }

            return { ...note, fileUrl };
        }),

    /**
     * Generate S3 Upload URL.
     * Auth: Protected
     */
    getUploadUrl: protectedProcedure
        .input(z.object({ filename: z.string(), contentType: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const uniqueId = uuidv4();
            const extension = input.filename.split(".").pop();
            const key = `notes/${ctx.session.user.id}/${uniqueId}.${extension}`;
            const url = await getPresignedUrl(key, input.contentType);
            return { url, s3Key: key };
        }),

    /**
     * Create a new note.
     * Auth: Protected
     */
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                s3Key: z.string(),
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
                        folderId: input.folderId ?? undefined,
                        versions: {
                            create: { version: 1, s3Key: input.s3Key },
                        },
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

    /**
     * Delete a note.
     * Auth: Author or Admin
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });
            if (!note) return null;

            if (note.authorId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
                throw new Error("UNAUTHORIZED");
            }

            return ctx.prisma.note.delete({ where: { id: input.id } });
        }),

    /**
     * Update note metadata.
     * Auth: Author
     */
    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1),
            description: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });
            if (!note) throw new Error("Note not found");

            if (note.authorId !== ctx.session.user.id) {
                throw new Error("UNAUTHORIZED");
            }

            return ctx.prisma.note.update({
                where: { id: input.id },
                data: {
                    title: input.title,
                    description: input.description,
                },
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

    /**
     * Get annotations for a version.
     */
    getAnnotations: protectedProcedure
        .input(z.object({ versionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const annotations = await ctx.prisma.annotation.findMany({
                where: {
                    userId: ctx.session.user.id,
                    page: { versionId: input.versionId }
                },
                include: { page: true }
            });

            // Map to [pageNum]: content
            const result: Record<number, any> = {};
            annotations.forEach(a => {
                result[a.page.number] = a.content;
            });
            return result;
        }),

    /**
     * Save annotation for a page.
     */
    saveAnnotation: protectedProcedure
        .input(z.object({
            versionId: z.string(),
            pageNumber: z.number(),
            content: z.any()
        }))
        .mutation(async ({ ctx, input }) => {
            // Lazy create page
            let page = await ctx.prisma.page.findUnique({
                where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } }
            });

            if (!page) {
                try {
                    page = await ctx.prisma.page.create({
                        data: { versionId: input.versionId, number: input.pageNumber }
                    });
                } catch {
                    page = await ctx.prisma.page.findUniqueOrThrow({
                        where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } }
                    });
                }
            }

            return ctx.prisma.annotation.upsert({
                where: {
                    userId_pageId: {
                        userId: ctx.session.user.id,
                        pageId: page.id
                    }
                },
                create: {
                    userId: ctx.session.user.id,
                    pageId: page.id,
                    content: input.content
                },
                update: {
                    content: input.content
                }
            });
        }),
});
