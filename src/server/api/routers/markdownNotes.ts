import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

/**
 * Markdown Notes Router
 * Handles CRUD operations for markdown-based notes
 */

// Zod schema for TipTap document validation
const tiptapDocumentSchema = z.object({
    type: z.literal('doc'),
    content: z.array(z.any()).optional(),
});

export const markdownNotesRouter = createTRPCRouter({
    /**
     * Create a new markdown note
     */
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                content: tiptapDocumentSchema.optional(),
                folderId: z.string().optional(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
                visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).default("PUBLIC"),
                groupIds: z.array(z.string()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user exists
            const userExists = await ctx.prisma.user.findUnique({
                where: { id: ctx.session.user.id },
                select: { id: true }
            });

            if (!userExists) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User account not found. Please log out and log in again."
                });
            }

            // Default empty document if none provided
            const initialContent = input.content || {
                type: 'doc' as const,
                content: [{ type: 'paragraph', content: [] }],
            };

            return ctx.prisma.$transaction(async (tx) => {
                // Create note with MARKDOWN type
                const note = await tx.note.create({
                    data: {
                        title: input.title,
                        description: input.description,
                        noteType: "MARKDOWN",
                        authorId: ctx.session.user.id,
                        folderId: input.folderId ?? undefined,
                        courseId: input.courseId ?? undefined,
                        semester: input.semester ?? undefined,
                        visibility: input.visibility,
                        isPublic: input.visibility === "PUBLIC",
                        // Create initial markdown version
                        markdownVersions: {
                            create: {
                                version: 1,
                                content: initialContent,
                            },
                        },
                        // Handle group sharing
                        sharedGroups: input.groupIds && input.visibility === "GROUP" ? {
                            connect: input.groupIds.map(id => ({ id }))
                        } : undefined
                    },
                    include: { markdownVersions: true },
                });

                // Set current version
                await tx.note.update({
                    where: { id: note.id },
                    data: { currentMarkdownVersionId: note.markdownVersions[0].id },
                });

                return note;
            });
        }),

    /**
     * Get a markdown note by ID
     */
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: {
                    markdownVersions: {
                        orderBy: { version: 'desc' },
                        take: 1,
                    },
                    author: true,
                    course: true,
                    sharedGroups: { select: { id: true, name: true } }
                },
            });

            if (!note) return null;
            if (note.noteType !== "MARKDOWN") return null; // Only return markdown notes

            const isAuthor = ctx.session?.user?.id === note.authorId;

            // Access check
            let hasAccess = isAuthor || note.visibility === "PUBLIC";

            if (!hasAccess && ctx.session?.user?.id) {
                // Check group access
                const noteWithGroups = await ctx.prisma.note.findUnique({
                    where: { id: input.id },
                    include: {
                        sharedGroups: {
                            include: {
                                members: { where: { userId: ctx.session.user.id } }
                            }
                        }
                    }
                });

                if (noteWithGroups?.sharedGroups.some(g => g.members.length > 0)) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) return null;

            // Get author image URL
            let authorImage = note.author.image;
            if (authorImage && !authorImage.startsWith("http")) {
                authorImage = await getPresignedDownloadUrl(authorImage);
            }

            // Get current version content
            const currentVersion = note.markdownVersions.find(v => v.id === note.currentMarkdownVersionId) || note.markdownVersions[0];

            return {
                ...note,
                content: currentVersion?.content || null,
                author: { ...note.author, image: authorImage },
                isEditable: isAuthor,
            };
        }),

    /**
     * Update markdown content (for autosave)
     */
    updateContent: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                content: tiptapDocumentSchema,
                createNewVersion: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: { markdownVersions: { orderBy: { version: 'desc' }, take: 1 } }
            });

            if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
            if (note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "You can only edit your own notes" });
            }
            if (note.noteType !== "MARKDOWN") {
                throw new TRPCError({ code: "BAD_REQUEST", message: "This is not a markdown note" });
            }

            const currentVersion = note.markdownVersions[0];

            if (input.createNewVersion || !currentVersion) {
                // Create new version
                const newVersion = await ctx.prisma.markdownVersion.create({
                    data: {
                        noteId: input.id,
                        version: (currentVersion?.version || 0) + 1,
                        content: input.content,
                    },
                });

                await ctx.prisma.note.update({
                    where: { id: input.id },
                    data: {
                        currentMarkdownVersionId: newVersion.id,
                        updatedAt: new Date(),
                    },
                });

                return { success: true, version: newVersion.version };
            } else {
                // Update existing version (autosave)
                await ctx.prisma.markdownVersion.update({
                    where: { id: currentVersion.id },
                    data: { content: input.content },
                });

                await ctx.prisma.note.update({
                    where: { id: input.id },
                    data: { updatedAt: new Date() },
                });

                return { success: true, version: currentVersion.version };
            }
        }),

    /**
     * Update note metadata
     */
    updateMetadata: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string().min(1).optional(),
                description: z.string().optional(),
                folderId: z.string().nullable().optional(),
                courseId: z.string().optional(),
                semester: z.string().optional(),
                visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).optional(),
                groupIds: z.array(z.string()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });

            if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
            if (note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "You can only edit your own notes" });
            }

            const updateData: any = {};

            if (input.title !== undefined) updateData.title = input.title;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.courseId !== undefined) updateData.courseId = input.courseId;
            if (input.semester !== undefined) updateData.semester = input.semester;

            if (input.visibility !== undefined) {
                updateData.visibility = input.visibility;
                updateData.isPublic = input.visibility === "PUBLIC";
            }

            // Handle groups
            if (input.visibility === "GROUP" && input.groupIds) {
                updateData.sharedGroups = {
                    set: input.groupIds.map(id => ({ id }))
                };
            } else if (input.visibility && input.visibility !== "GROUP") {
                updateData.sharedGroups = { set: [] };
            }

            // Handle folder
            if (input.folderId !== undefined) {
                if (input.folderId !== null) {
                    const folder = await ctx.prisma.folder.findUnique({ where: { id: input.folderId } });
                    if (!folder || folder.userId !== ctx.session.user.id) {
                        throw new TRPCError({ code: "BAD_REQUEST", message: "Folder not found or unauthorized" });
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
     * Delete a markdown note
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });

            if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });

            // Allow owner or admin to delete
            if (note.authorId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
            }

            return ctx.prisma.note.delete({ where: { id: input.id } });
        }),

    /**
     * Save a markdown note (creates new version)
     */
    save: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                content: tiptapDocumentSchema,
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: { markdownVersions: { orderBy: { version: 'desc' }, take: 1 } }
            });

            if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
            if (note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
            }

            const currentVersion = note.markdownVersions[0];
            const newVersion = await ctx.prisma.markdownVersion.create({
                data: {
                    noteId: input.id,
                    version: (currentVersion?.version || 0) + 1,
                    content: input.content,
                },
            });

            await ctx.prisma.note.update({
                where: { id: input.id },
                data: {
                    currentMarkdownVersionId: newVersion.id,
                    updatedAt: new Date(),
                },
            });

            return { success: true, version: newVersion.version };
        }),

    /**
     * Get all markdown notes for the current user
     */
    getMyNotes: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    authorId: ctx.session.user.id,
                    noteType: "MARKDOWN",
                },
                orderBy: { updatedAt: "desc" },
                include: {
                    author: true,
                    markdownVersions: {
                        take: 1,
                        orderBy: { version: 'desc' },
                        select: { version: true, createdAt: true }
                    }
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            return { items, nextCursor };
        }),

    /**
     * Get all public markdown notes
     */
    getPublic: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const limit = input.limit ?? 20;
            const cursor = input.cursor;

            const whereClause: any = {
                noteType: "MARKDOWN",
                visibility: "PUBLIC",
            };

            if (input.search) {
                whereClause.OR = [
                    { title: { contains: input.search, mode: 'insensitive' } },
                    { description: { contains: input.search, mode: 'insensitive' } },
                ];
            }

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: whereClause,
                orderBy: { createdAt: "desc" },
                include: {
                    author: true,
                    markdownVersions: {
                        take: 1,
                        orderBy: { version: 'desc' },
                        select: { version: true }
                    }
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            // Resolve author images
            const itemsWithImages = await Promise.all(items.map(async (item) => {
                let authorImage = item.author.image;
                if (authorImage && !authorImage.startsWith("http")) {
                    authorImage = await getPresignedDownloadUrl(authorImage);
                }
                return {
                    ...item,
                    author: { ...item.author, image: authorImage }
                };
            }));

            return { items: itemsWithImages, nextCursor };
        }),
});
