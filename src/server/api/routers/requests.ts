
import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { BoardRequestStatus } from "@prisma/client";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const requestsRouter = createTRPCRouter({

    // --- Create ---
    create: protectedProcedure
        .input(z.object({
            title: z.string().min(5).max(100),
            description: z.string().min(10),
            tags: z.array(z.string()).max(5),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.request.create({
                data: {
                    title: input.title,
                    description: input.description,
                    tags: input.tags,
                    userId: ctx.session.user.id,
                },
            });
        }),

    // --- Get Bundle ---
    getAll: publicProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(10),
            cursor: z.string().nullish(),
            filter: z.object({
                status: z.nativeEnum(BoardRequestStatus).optional(),
                tag: z.string().optional(),
            }).optional(),
            search: z.string().optional(),
            sort: z.enum(['new', 'top']).default('new'),
        }))
        .query(async ({ ctx, input }) => {
            const { limit, cursor, filter, sort, search } = input;

            const orderBy = sort === 'top'
                ? [
                    { status: 'asc' as const }, // OPEN comes before FULFILLED alphabetically
                    { upvotes: { _count: 'desc' as const } }
                ]
                : [
                    { status: 'asc' as const },
                    { createdAt: 'desc' as const }
                ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where: any = {
                ...(filter?.status ? { status: filter.status } : {}),
                ...(filter?.tag ? { tags: { has: filter.tag } } : {}),
            };

            if (search) {
                where.title = { contains: search, mode: 'insensitive' };
            }

            const requests = await ctx.prisma.request.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy,
                where,
                include: {
                    user: {
                        select: {
                            id: true, name: true, image: true
                        }
                    },
                    _count: {
                        select: {
                            upvotes: true,
                            fulfillments: true,
                        }
                    },
                    upvotes: ctx.session?.user ? {
                        where: { userId: ctx.session.user.id },
                        select: { id: true }
                    } : false,
                }
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (requests.length > limit) {
                const nextItem = requests.pop();
                nextCursor = nextItem!.id;
            }

            // Resolve user images
            const requestsWithImages = await Promise.all(requests.map(async (req) => {
                let userImage = req.user.image;
                if (userImage && !userImage.startsWith("http")) {
                    userImage = await getPresignedDownloadUrl(userImage);
                }
                return {
                    ...req,
                    user: { ...req.user, image: userImage },
                    isUpvoted: req.upvotes?.length > 0,
                };
            }));

            return {
                requests: requestsWithImages,
                nextCursor,
            };
        }),

    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({
                where: { id: input.id },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                    _count: { select: { upvotes: true, fulfillments: true } },
                    upvotes: ctx.session?.user ? { where: { userId: ctx.session.user.id } } : false,
                    fulfillments: {
                        include: {
                            note: true,
                            user: { select: { id: true, name: true, image: true } }
                        }
                    },
                    comments: {
                        include: {
                            user: { select: { id: true, name: true, image: true } },
                            _count: { select: { upvotes: true } },
                            upvotes: ctx.session?.user ? { where: { userId: ctx.session.user.id } } : false,
                        },
                        orderBy: { createdAt: 'asc' } // Oldest first for threads usually, or keep desc? Let's use asc for structure
                    }
                }
            });

            if (!request) throw new TRPCError({ code: "NOT_FOUND" });

            let requestUserImage = request.user.image;
            if (requestUserImage && !requestUserImage.startsWith("http")) {
                requestUserImage = await getPresignedDownloadUrl(requestUserImage);
            }

            // Resolve Comments User Images & Upvote State
            const commentsWithImages = await Promise.all(request.comments.map(async (c) => {
                let cUserImage = c.user.image;
                if (cUserImage && !cUserImage.startsWith("http")) {
                    cUserImage = await getPresignedDownloadUrl(cUserImage);
                }
                return {
                    ...c,
                    user: { ...c.user, image: cUserImage },
                    isUpvoted: c.upvotes?.length > 0
                };
            }));

            // Structure comments into threads (Client-side usually, but we can return flat list with parentIds)
            // We'll return flat list and let UI handle nesting or just return nested if we want.
            // For simple 2-level, flat with parentId is easy.

            // Resolve Fulfillments User Images
            const fulfillmentsWithImages = await Promise.all(request.fulfillments.map(async (f) => {
                let fUserImage = f.user.image;
                if (fUserImage && !fUserImage.startsWith("http")) {
                    fUserImage = await getPresignedDownloadUrl(fUserImage);
                }
                return { ...f, user: { ...f.user, image: fUserImage } };
            }));

            return {
                ...request,
                user: { ...request.user, image: requestUserImage },
                comments: commentsWithImages,
                fulfillments: fulfillmentsWithImages,
                isUpvoted: request.upvotes?.length > 0,
            };
        }),

    // --- Interactions ---
    toggleUpvote: protectedProcedure
        .input(z.object({ requestId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.prisma.requestUpvote.findUnique({
                where: {
                    userId_requestId: {
                        userId: ctx.session.user.id,
                        requestId: input.requestId,
                    }
                }
            });

            if (existing) {
                await ctx.prisma.requestUpvote.delete({ where: { id: existing.id } });
                return { added: false };
            } else {
                await ctx.prisma.requestUpvote.create({
                    data: {
                        userId: ctx.session.user.id,
                        requestId: input.requestId,
                    }
                });
                // TODO: Notification here
                return { added: true };
            }
        }),

    fulfill: protectedProcedure
        .input(z.object({ requestId: z.string(), noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check ownership of note
            const note = await ctx.prisma.note.findUnique({ where: { id: input.noteId } });
            if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
            if (note.authorId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only fulfill with your own notes" });
            }

            // Check if already fulfilled with this note
            const existingFulfillment = await ctx.prisma.requestFulfillment.findUnique({
                where: {
                    requestId_noteId: {
                        requestId: input.requestId,
                        noteId: input.noteId,
                    }
                }
            });

            if (existingFulfillment) {
                return existingFulfillment; // Idempotent success
            }

            const fulfillment = await ctx.prisma.requestFulfillment.create({
                data: {
                    requestId: input.requestId,
                    noteId: input.noteId,
                    userId: ctx.session.user.id,
                }
            });

            // Optionally mark request as FULFILLED, but maybe we allow multiple answers?
            // Let's keep it OPEN for now, or update if user is the requester?

            // Notify Requester
            const request = await ctx.prisma.request.findUnique({ where: { id: input.requestId } });
            if (request && request.userId !== ctx.session.user.id) {
                await ctx.prisma.notification.create({
                    data: {
                        userId: request.userId,
                        type: "REQUEST_FULFILLED",
                        actorId: ctx.session.user.id,
                        isRead: false,
                        data: { requestId: request.id, noteId: note.id, requestTitle: request.title }
                    }
                })
            }

            return fulfillment;
        }),

    // --- Advanced Interactions ---

    toggleCommentUpvote: protectedProcedure
        .input(z.object({ commentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.prisma.commentUpvote.findUnique({
                where: {
                    userId_commentId: {
                        userId: ctx.session.user.id,
                        commentId: input.commentId,
                    }
                }
            });

            if (existing) {
                await ctx.prisma.commentUpvote.delete({ where: { id: existing.id } });
                return { added: false };
            } else {
                await ctx.prisma.commentUpvote.create({
                    data: {
                        userId: ctx.session.user.id,
                        commentId: input.commentId,
                    }
                });
                return { added: true };
            }
        }),

    delete: protectedProcedure
        .input(z.object({ requestId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({ where: { id: input.requestId } });
            if (!request) throw new TRPCError({ code: "NOT_FOUND" });

            if (request.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
            }

            await ctx.prisma.request.delete({ where: { id: input.requestId } });
            return { success: true };
        }),

    markFulfilled: protectedProcedure
        .input(z.object({ requestId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({ where: { id: input.requestId } });
            if (!request) throw new TRPCError({ code: "NOT_FOUND" });

            if (request.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only the author can mark as fulfilled" });
            }

            return ctx.prisma.request.update({
                where: { id: input.requestId },
                data: { status: "FULFILLED" }
            });
        }),

    addComment: protectedProcedure
        .input(z.object({
            requestId: z.string(),
            content: z.string().min(1),
            parentId: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.comment.create({
                data: {
                    content: input.content,
                    requestId: input.requestId,
                    userId: ctx.session.user.id,
                    parentId: input.parentId
                }
            });
        }),
});
