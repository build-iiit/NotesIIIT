import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";

export const adminRouter = createTRPCRouter({
    /**
     * Get platform-wide statistics
     * Auth: Admin only
     */
    getStats: adminProcedure.query(async ({ ctx }) => {
        const [totalUsers, totalNotes, , totalVotes] = await Promise.all([
            ctx.prisma.user.count(),
            ctx.prisma.note.count(),
            ctx.prisma.view.count(),
            ctx.prisma.vote.count(),
        ]);

        // Get stats aggregations
        const noteStats = await ctx.prisma.note.aggregate({
            _sum: {
                viewCount: true,
                voteScore: true,
            },
        });

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [recentNotes, recentUsers, recentViews] = await Promise.all([
            ctx.prisma.note.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.view.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        ]);

        return {
            totalUsers,
            totalNotes,
            totalViews: noteStats._sum.viewCount || 0,
            totalVotes,
            totalUpvotes: noteStats._sum.voteScore || 0,
            recentActivity: {
                notes: recentNotes,
                users: recentUsers,
                views: recentViews,
            },
        };
    }),

    /**
     * Get all users with pagination and stats
     * Auth: Admin only
     */
    getAllUsers: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const cursor = input?.cursor;
            const search = input?.search;

            const where = search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" as const } },
                        { email: { contains: search, mode: "insensitive" as const } },
                    ],
                }
                : undefined;

            const users = await ctx.prisma.user.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: {
                            notes: true,
                            comments: true,
                            votes: true,
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (users.length > limit) {
                const nextItem = users.pop();
                nextCursor = nextItem!.id;
            }

            // Get karma for each user
            const usersWithKarma = await Promise.all(
                users.map(async (user) => {
                    const noteStats = await ctx.prisma.note.aggregate({
                        where: { authorId: user.id },
                        _sum: { voteScore: true, viewCount: true },
                    });

                    return {
                        ...user,
                        karma: noteStats._sum.voteScore || 0,
                        totalViews: noteStats._sum.viewCount || 0,
                    };
                })
            );

            return { users: usersWithKarma, nextCursor };
        }),

    /**
     * Update user role
     * Auth: Admin only
     */
    updateUserRole: adminProcedure
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(["USER", "ADMIN"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Prevent self-demotion
            if (input.userId === ctx.session.user.id && input.role === "USER") {
                throw new Error("Cannot demote yourself");
            }

            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { role: input.role },
            });
        }),

    /**
     * Delete any user
     * Auth: Admin only
     */
    deleteUser: adminProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Prevent self-deletion
            if (input.userId === ctx.session.user.id) {
                throw new Error("Cannot delete yourself");
            }

            return ctx.prisma.user.delete({
                where: { id: input.userId },
            });
        }),

    /**
     * Get all notes (including private) with pagination
     * Auth: Admin only
     */
    getAllNotes: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                isPublic: z.boolean().optional(),
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const cursor = input?.cursor;

            const where: {
                isPublic?: boolean;
                OR?: { title: { contains: string; mode: "insensitive" } }[];
            } = {};

            if (input?.isPublic !== undefined) {
                where.isPublic = input.isPublic;
            }

            if (input?.search) {
                where.OR = [
                    { title: { contains: input.search, mode: "insensitive" as const } },
                ];
            }

            const notes = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                    _count: {
                        select: {
                            comments: true,
                            views: true,
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (notes.length > limit) {
                const nextItem = notes.pop();
                nextCursor = nextItem!.id;
            }

            return { notes, nextCursor };
        }),

    /**
     * Delete any note (admin override)
     * Auth: Admin only
     */
    deleteNote: adminProcedure
        .input(z.object({ noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.note.delete({
                where: { id: input.noteId },
            });
        }),
});
