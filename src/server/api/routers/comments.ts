import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const commentsRouter = createTRPCRouter({
    /**
     * Get comments for a page.
     * Auth: Public
     */
    getByPage: publicProcedure
        .input(z.object({ versionId: z.string(), pageNumber: z.number() }))
        .query(async ({ ctx, input }) => {
            const page = await ctx.prisma.page.findUnique({
                where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
                include: {
                    comments: {
                        where: { parentId: null }, // Fetch roots
                        include: {
                            user: true,
                            children: { include: { user: true } } // Fetch 1 level down
                        },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            if (!page?.comments) return [];

            // Resolve images
            return await Promise.all(page.comments.map(async (comment) => {
                if (comment.user.image && !comment.user.image.startsWith("http")) {
                    comment.user.image = await getPresignedDownloadUrl(comment.user.image);
                }

                // Resolve children images
                if (comment.children) {
                    comment.children = await Promise.all(comment.children.map(async (child) => {
                        if (child.user.image && !child.user.image.startsWith("http")) {
                            child.user.image = await getPresignedDownloadUrl(child.user.image);
                        }
                        return child;
                    }));
                }

                return comment;
            }));
        }),

    /**
     * Post a comment.
     * Auth: Protected
     */
    create: protectedProcedure
        .input(
            z.object({
                versionId: z.string(),
                pageNumber: z.number(),
                content: z.string().min(1),
                parentId: z.string().optional(),
                isPrivate: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const page = await ctx.prisma.page.upsert({
                where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
                create: { versionId: input.versionId, number: input.pageNumber },
                update: {},
            });

            const comment = await ctx.prisma.comment.create({
                data: {
                    content: input.content,
                    userId: ctx.session.user.id,
                    pageId: page.id,
                    parentId: input.parentId,
                    isPrivate: input.isPrivate,
                },
            });

            // Get the note author to notify them
            const noteVersion = await ctx.prisma.noteVersion.findUnique({
                where: { id: input.versionId },
                include: { note: { select: { authorId: true, id: true, title: true } } }
            });

            if (noteVersion?.note) {
                const noteAuthorId = noteVersion.note.authorId;

                // If this is a reply to another comment, notify the parent comment author
                if (input.parentId) {
                    const parentComment = await ctx.prisma.comment.findUnique({
                        where: { id: input.parentId },
                        select: { userId: true }
                    });

                    // Notify parent comment author (if not replying to themselves)
                    if (parentComment && parentComment.userId !== ctx.session.user.id) {
                        await ctx.prisma.notification.create({
                            data: {
                                userId: parentComment.userId,
                                actorId: ctx.session.user.id,
                                type: "REPLY_TO_COMMENT",
                                data: {
                                    noteId: noteVersion.note.id,
                                    noteTitle: noteVersion.note.title,
                                    commentId: comment.id,
                                    versionId: input.versionId,
                                    pageNumber: input.pageNumber
                                }
                            }
                        });
                    }
                }

                // Notify note author about the comment (if not commenting on their own note)
                // and not already notified as parent comment author
                if (noteAuthorId !== ctx.session.user.id) {
                    await ctx.prisma.notification.create({
                        data: {
                            userId: noteAuthorId,
                            actorId: ctx.session.user.id,
                            type: "COMMENT_ON_NOTE",
                            data: {
                                noteId: noteVersion.note.id,
                                noteTitle: noteVersion.note.title,
                                commentId: comment.id,
                                versionId: input.versionId,
                                pageNumber: input.pageNumber
                            }
                        }
                    });
                }
            }

            return comment;
        }),
});
