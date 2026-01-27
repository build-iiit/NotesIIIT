import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

export const votesRouter = createTRPCRouter({
    /**
     * Get vote stats for a page.
     * Auth: Public
     */
    getStats: publicProcedure
        .input(z.object({ versionId: z.string(), pageNumber: z.number() }))
        .query(async ({ ctx, input }) => {
            const page = await ctx.prisma.page.findUnique({
                where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
                include: { votes: true },
            });

            if (!page) return { up: 0, down: 0, userVote: null };

            return {
                up: page.votes.filter(v => v.type === "UP").length,
                down: page.votes.filter(v => v.type === "DOWN").length,
                userVote: ctx.session?.user?.id ? page.votes.find(v => v.userId === ctx.session!.user.id)?.type : null
            };
        }),

    /**
     * Cast or Toggle a vote.
     * Auth: Protected
     */
    vote: protectedProcedure
        .input(
            z.object({
                versionId: z.string(),
                pageNumber: z.number(),
                type: z.enum(["UP", "DOWN"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Lazy create Page
            const page = await ctx.prisma.page.upsert({
                where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
                create: { versionId: input.versionId, number: input.pageNumber },
                update: {},
                include: { version: { include: { note: true } } }
            });

            // If we didn't include version.note in upsert output (Prisma quirk), fetch it or assume aggregation risk.
            // Better to perform aggregation separately to keep upsert clean or use transaction.

            const existingVote = await ctx.prisma.vote.findUnique({
                where: { userId_pageId: { userId: ctx.session.user.id, pageId: page.id } },
            });

            let scoreDelta = 0;
            let isNewUpvote = false;

            if (existingVote) {
                if (existingVote.type === input.type) {
                    // Removing vote
                    scoreDelta = existingVote.type === "UP" ? -1 : 1;
                    await ctx.prisma.vote.delete({ where: { id: existingVote.id } });
                } else {
                    // Changing vote (flip)
                    scoreDelta = input.type === "UP" ? 2 : -2; // -1 -> +1 = +2, +1 -> -1 = -2
                    await ctx.prisma.vote.update({
                        where: { id: existingVote.id },
                        data: { type: input.type },
                    });
                    if (input.type === "UP") isNewUpvote = true;
                }
            } else {
                // New vote
                scoreDelta = input.type === "UP" ? 1 : -1;
                await ctx.prisma.vote.create({
                    data: {
                        userId: ctx.session.user.id,
                        pageId: page.id,
                        type: input.type,
                    },
                });
                if (input.type === "UP") isNewUpvote = true;
            }

            // Propagate to Note Score
            // We need the Note ID. 'page' result above might not have relations if we didn't include them in upsert return type explicitly in some prisma versions, 
            // but we can fetch the noteID via the versionId.
            const noteVersion = await ctx.prisma.noteVersion.findUnique({
                where: { id: input.versionId },
                include: { note: { select: { id: true, authorId: true, title: true } } }
            });

            if (noteVersion && scoreDelta !== 0) {
                await ctx.prisma.note.update({
                    where: { id: noteVersion.noteId },
                    data: {
                        voteScore: { increment: scoreDelta }
                    }
                });
            }

            // Create/update batched vote notification for upvotes only (not downvotes, to avoid negativity)
            if (isNewUpvote && noteVersion?.note && noteVersion.note.authorId !== ctx.session.user.id) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

                // Check if there's a recent vote notification for this note
                const existingNotification = await ctx.prisma.notification.findFirst({
                    where: {
                        userId: noteVersion.note.authorId,
                        type: "VOTES_ON_NOTE",
                        createdAt: { gte: oneHourAgo },
                        data: {
                            path: ["noteId"],
                            equals: noteVersion.note.id
                        }
                    }
                });

                if (existingNotification) {
                    // Update the existing notification with new count
                    const currentData = existingNotification.data as { noteId: string; noteTitle: string; voteCount: number } | null;
                    const currentCount = currentData?.voteCount ?? 1;

                    await ctx.prisma.notification.update({
                        where: { id: existingNotification.id },
                        data: {
                            isRead: false, // Mark as unread again
                            createdAt: new Date(), // Bump timestamp
                            data: {
                                noteId: noteVersion.note.id,
                                noteTitle: noteVersion.note.title,
                                voteCount: currentCount + 1
                            }
                        }
                    });
                } else {
                    // Create new vote notification
                    await ctx.prisma.notification.create({
                        data: {
                            userId: noteVersion.note.authorId,
                            actorId: ctx.session.user.id,
                            type: "VOTES_ON_NOTE",
                            data: {
                                noteId: noteVersion.note.id,
                                noteTitle: noteVersion.note.title,
                                voteCount: 1
                            }
                        }
                    });
                }
            }

            return { success: true };
        }),
});
