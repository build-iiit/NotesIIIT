import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

export const authRouter = createTRPCRouter({
    /**
     * Get the current user's profile.
     * Auth: Public (returns null if not logged in) or Protected
     */
    getMe: publicProcedure.query(({ ctx }) => {
        return ctx.session?.user || null;
    }),

    /**
     * Get a public user profile by ID.
     */
    getProfile: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    createdAt: true,
                    notes: {
                        where: { isPublic: true },
                        orderBy: { createdAt: "desc" },
                        take: 12,
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: { notes: true },
                    },
                },
            });

            if (!user) return null;

            // Calculate total views and karma
            const stats = await ctx.prisma.note.aggregate({
                where: {
                    authorId: input.userId,
                    isPublic: true,
                },
                _sum: {
                    viewCount: true,
                    voteScore: true,
                },
            });

            // Get user's rank on the leaderboard
            const usersWithHigherScore = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT u.id)::int as count
                FROM "User" u
                LEFT JOIN "Note" n ON u.id = n."authorId"
                GROUP BY u.id
                HAVING COALESCE(SUM(n."voteScore"), 0) > ${stats._sum.voteScore || 0}
            `;
            const rank = Number(usersWithHigherScore[0]?.count || 0) + 1;

            return {
                ...user,
                totalViews: stats._sum.viewCount || 0,
                totalKarma: stats._sum.voteScore || 0,
                rank,
            };
        }),

    /**
     * Update the current user's profile.
     * Auth: Protected
     */
    updateProfile: protectedProcedure
        .input(z.object({ name: z.string().min(1).optional() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.user.update({
                where: { id: ctx.session.user.id },
                data: { name: input.name },
            });
        }),
});
