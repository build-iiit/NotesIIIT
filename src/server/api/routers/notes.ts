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
                cursor: z.string().nullish(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;
            const userId = ctx.session?.user?.id;

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    OR: [
                        { visibility: "PUBLIC" },
                        // Private/Group notes visible to author
                        ...(userId ? [{ authorId: userId }] : []),
                        // Group notes visible to members
                        ...(userId ? [{
                            visibility: "GROUP",
                            sharedGroups: {
                                some: {
                                    members: { some: { userId } }
                                }
                            }
                        }] : [])
                    ]
                },
                orderBy: { createdAt: "desc" },
                include: { author: true, course: true },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            // Resolve thumbnails
            const itemsWithThumbnails = await Promise.all(items.map(async (item) => {
                let thumbnailUrl = "";
                if (item.thumbnailS3Key) {
                    thumbnailUrl = await getPresignedDownloadUrl(item.thumbnailS3Key);
                }
                return { ...item, thumbnailUrl };
            }));

            return { items: itemsWithThumbnails, nextCursor };
        }),

    /**
     * Get trending notes (Top 6 by view count).
     * Source: NEW-FEATURES
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

    /**
     * Get a single note by ID with its current version and S3 URL.
     * Source: MAIN (Security check preserved)
     */
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                // Include sharedGroups to let frontend know about current sharing status
                include: { versions: true, author: true, course: true, sharedGroups: { select: { id: true, name: true } } },
            });

            if (!note) return null;

            const isAuthor = ctx.session?.user?.id === note.authorId;

            // Access Check
            let hasAccess = isAuthor || note.visibility === "PUBLIC";

            if (!hasAccess && ctx.session?.user?.id) {
                // Check group access
                if (note.visibility === "GROUP") {
                    const noteWithGroups = await ctx.prisma.note.findUnique({
                        where: { id: input.id },
                        include: { sharedGroups: { include: { members: { where: { userId: ctx.session.user.id } } } } }
                    });
                    if (noteWithGroups?.sharedGroups.some(g => g.members.length > 0)) {
                        hasAccess = true;
                    }
                }
            }

            if (!hasAccess) return null;

            let fileUrl = "";
            const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];

            if (currentVersion?.s3Key) {
                fileUrl = await getPresignedDownloadUrl(currentVersion.s3Key);
            }

            return { ...note, fileUrl };
        }),

    /**
     * Generate S3 Upload URL.
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
     * Source: MERGED (Includes Folder support and Thumbnail keys)
     */
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                // Merged Inputs
                s3Key: z.string().min(1),
                folderId: z.string().optional(),     // From Main
                thumbnailKey: z.string().nullish(),  // From NEW-FEATURES
                
                courseId: z.string().optional(),
                semester: z.string().optional(),
                visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).default("PUBLIC"),
                groupIds: z.array(z.string()).optional(),
                thumbnailS3Key: z.string().optional()
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
                        courseId: input.courseId ?? undefined,
                        semester: input.semester ?? undefined,
                        visibility: input.visibility,
                        isPublic: input.visibility === "PUBLIC",
                        thumbnailS3Key: input.thumbnailS3Key,
                        versions: {
                            create: {
                                version: 1,
                                s3Key: input.s3Key,
                                // Merged: Save the thumbnail key if provided
                                thumbnailKey: input.thumbnailKey, 
                            },
                        },
                        // Merged: Handle Group connections
                        sharedGroups: input.groupIds && input.visibility === "GROUP" ? {
                            connect: input.groupIds.map(id => ({ id }))
                        } : undefined
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
     * Update metadata: Combines Course/Semester (main) with Folder ownership (Feature).
     */
    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            folderId: z.string().nullable().optional(),
            courseId: z.string().optional(),
            semester: z.string().optional(),
            visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).optional(),
            groupIds: z.array(z.string()).optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });
            if (!note) throw new Error("Note not found");
            if (note.authorId !== ctx.session.user.id) throw new Error("UNAUTHORIZED");

            const updateData: any = {
                title: input.title,
                description: input.description,
                courseId: input.courseId,
                semester: input.semester,
                // Add visibility logic
                visibility: input.visibility,
                isPublic: input.visibility === "PUBLIC", // Update legacy field
            };

            // Handle Groups
            if (input.visibility === "GROUP" && input.groupIds) {
                updateData.sharedGroups = {
                    set: input.groupIds.map(id => ({ id }))
                };
            } else if (input.visibility !== "GROUP") {
                updateData.sharedGroups = { set: [] }; // Clear groups if not GROUP visibility
            }

            // Folder logic from Feature branch
            if (input.folderId !== undefined) {
                if (input.folderId !== null) {
                    const folder = await ctx.prisma.folder.findUnique({ where: { id: input.folderId } });
                    if (!folder || folder.userId !== ctx.session.user.id) {
                        throw new Error("Folder not found or unauthorized");
                    }
                }
                updateData.folderId = input.folderId;
            }

            return ctx.prisma.note.update({
                where: { id: input.id },
                data: updateData,
            });
        }),

    /**
     * Move a note to a different folder.
     */
    moveToFolder: protectedProcedure
        .input(z.object({
            noteId: z.string(),
            folderId: z.string().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.noteId } });
            if (!note || note.authorId !== ctx.session.user.id) throw new Error("UNAUTHORIZED");

            if (input.folderId) {
                const folder = await ctx.prisma.folder.findUnique({ where: { id: input.folderId } });
                if (!folder || folder.userId !== ctx.session.user.id) throw new Error("UNAUTHORIZED");
            }

            return ctx.prisma.note.update({
                where: { id: input.noteId },
                data: { folderId: input.folderId },
            });
        }),

    /**
     * Annotation Features from Main branch.
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

            const result: Record<number, any> = {};
            annotations.forEach(a => {
                result[a.page.number] = a.content;
            });
            return result;
        }),

    saveAnnotation: protectedProcedure
        .input(z.object({
            versionId: z.string(),
            pageNumber: z.number(),
            content: z.any()
        }))
        .mutation(async ({ ctx, input }) => {
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
                where: { userId_pageId: { userId: ctx.session.user.id, pageId: page.id } },
                create: { userId: ctx.session.user.id, pageId: page.id, content: input.content },
                update: { content: input.content }
            });
        }),

    trackView: publicProcedure
        .input(z.object({ noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session?.user?.id;
            const note = await ctx.prisma.note.findUnique({ where: { id: input.noteId } });
            if (!note) throw new Error("Note not found");

            if (userId === note.authorId) return { success: false };

            if (userId) {
                const recentView = await ctx.prisma.view.findFirst({
                    where: {
                        noteId: input.noteId,
                        userId: userId,
                        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    },
                });
                if (recentView) return { success: false };
            }

            await ctx.prisma.$transaction([
                ctx.prisma.view.create({ data: { noteId: input.noteId, userId: userId || null } }),
                ctx.prisma.note.update({
                    where: { id: input.noteId },
                    data: { viewCount: { increment: 1 } },
                }),
            ]);
            return { success: true };
        }),

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
});