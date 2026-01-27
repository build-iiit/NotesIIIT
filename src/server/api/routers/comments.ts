import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const commentsRouter = createTRPCRouter({
    /**
     * Get comments for a page with upvote information.
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
                            children: {
                                include: {
                                    user: true,
                                    upvotes: true,
                                    _count: { select: { upvotes: true } }
                                }
                            },
                            upvotes: true,
                            _count: { select: { upvotes: true } }
                        },
                        orderBy: [
                            { upvotes: { _count: "desc" } },
                            { createdAt: "desc" }
                        ],
                    },
                },
            });

            if (!page?.comments) return [];

            const userId = ctx.session?.user?.id;

            // Resolve images and add upvote status
            return await Promise.all(page.comments.map(async (comment) => {
                if (comment.user.image && !comment.user.image.startsWith("http")) {
                    comment.user.image = await getPresignedDownloadUrl(comment.user.image);
                }

                // Add user's upvote status
                const isUpvoted = userId ? comment.upvotes.some(upvote => upvote.userId === userId) : false;

                // Resolve children images and upvote status
                if (comment.children) {
                    comment.children = await Promise.all(comment.children.map(async (child) => {
                        if (child.user.image && !child.user.image.startsWith("http")) {
                            child.user.image = await getPresignedDownloadUrl(child.user.image);
                        }

                        const childIsUpvoted = userId ? child.upvotes.some(upvote => upvote.userId === userId) : false;

                        return {
                            ...child,
                            isUpvoted: childIsUpvoted
                        };
                    }));
                }

                return {
                    ...comment,
                    isUpvoted
                };
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

    /**
     * Toggle upvote on a comment
     * Auth: Protected
     */
    toggleCommentUpvote: protectedProcedure
        .input(z.object({ commentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Check if already upvoted
            const existingUpvote = await ctx.prisma.commentUpvote.findUnique({
                where: {
                    userId_commentId: {
                        userId,
                        commentId: input.commentId,
                    },
                },
            });

            if (existingUpvote) {
                // Remove upvote
                await ctx.prisma.commentUpvote.delete({
                    where: { id: existingUpvote.id },
                });
                return { upvoted: false };
            } else {
                // Add upvote
                await ctx.prisma.commentUpvote.create({
                    data: {
                        userId,
                        commentId: input.commentId,
                    },
                });
                return { upvoted: true };
            }
        }),
});
