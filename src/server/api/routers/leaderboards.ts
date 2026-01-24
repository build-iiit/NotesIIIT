import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

type TopContributorRaw = {
    id: string;
    name: string | null;
    image: string | null;
    totalScore: number | bigint;
    noteCount: number | bigint;
};

type TrendingNoteRaw = {
    id: string;
    title: string;
    description: string | null;
    authorId: string;
    authorName: string;
    authorImage: string | null;
    viewCount: number;
    voteScore: number;
    createdAt: Date;
    updatedAt: Date;
    currentVersionId: string | null;
    isPublic: boolean;
};

export const leaderboardsRouter = createTRPCRouter({
    /**
     * Top notes by view count.
     */
    topNotes: publicProcedure.query(async ({ ctx }) => {
        return ctx.prisma.note.findMany({
            take: 10,
            orderBy: { viewCount: "desc" },
            include: { author: true },
        });
    }),

    /**
     * Top contributors by note count.
     */
    /**
     * Top contributors by total upvotes (Karma).
     */
    topContributors: publicProcedure.query(async ({ ctx }) => {
        const users = await ctx.prisma.$queryRaw<TopContributorRaw[]>`
            SELECT u.id, u.name, u.image, 
            CAST(COALESCE(SUM(n."voteScore"), 0) AS INTEGER) as "totalScore",
            COUNT(n.id) as "noteCount"
            FROM "User" u
            LEFT JOIN "Note" n ON u.id = n."authorId"
            GROUP BY u.id
            ORDER BY "totalScore" DESC
            LIMIT 10;
        `;

        // Map to match frontend expectations
        // Frontend expects: { _count: { notes: number }, ...user }
        // We'll adapt the frontend to use "totalScore" or map it here.
        // Let's adapt the frontend component to be smarter.
        // For now, return a shape that includes both.
        return users.map(u => ({
            ...u,
            _count: { notes: Number(u.noteCount) },
            totalScore: Number(u.totalScore)
        }));
    }),
    /**
     * Trending notes based on Hacker News algorithm.
     * Score = (VoteScore + 1) / Pow((AgeInHours + 2), Gravity)
     */
    trending: publicProcedure.query(async ({ ctx }) => {
        // Use raw query for complex sorting logic efficiently
        const notes = await ctx.prisma.$queryRaw<TrendingNoteRaw[]>`
            SELECT n.*, u.name as "authorName", u.image as "authorImage"
            FROM "Note" n
            JOIN "User" u ON n."authorId" = u.id
            ORDER BY 
              (n."voteScore" + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - n."createdAt"))/3600 + 2, 1.8) DESC
            LIMIT 20;
        `;

        // Map raw result to expected shape (Prisma raw returns generic object)
        // We need to match the shape expected by frontend components if possible or create a new one.
        // Simple mapping:
        return notes.map(n => ({
            ...n,
            author: {
                name: n.authorName,
                image: n.authorImage,
            }
        }));
    }),
});
