import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";

/**
 * Type definitions for raw SQL results
 */
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
     * Top notes by total upvotes (vote score).
     */
    topNotes: publicProcedure.query(async ({ ctx }) => {
        const notes = await ctx.prisma.note.findMany({
            take: 10,
            orderBy: { voteScore: "desc" },
            include: { author: true },
        });

        // Resolve S3 images for authors in top notes
        return await Promise.all(
            notes.map(async (note) => {
                const authorImage = note.author.image && !note.author.image.startsWith("http")
                    ? await getPresignedDownloadUrl(note.author.image)
                    : note.author.image;
                
                return {
                    ...note,
                    author: { ...note.author, image: authorImage }
                };
            })
        );
    }),

    /**
     * Top contributors by total upvotes (Karma).
     * Combines strict typing (main) with S3 resolution (Feature-additions)
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

        // Resolve S3 URLs and map to frontend-expected shape
        return await Promise.all(
            users.map(async (u) => {
                const imageUrl = u.image && !u.image.startsWith("http")
                    ? await getPresignedDownloadUrl(u.image)
                    : u.image;

                return {
                    id: u.id,
                    name: u.name,
                    image: imageUrl,
                    totalScore: Number(u.totalScore),
                    _count: { notes: Number(u.noteCount) }, // Shape expected by UserStatsCard
                };
            })
        );
    }),

    /**
     * Trending notes based on Hacker News algorithm logic.
     */
    trending: publicProcedure.query(async ({ ctx }) => {
        // Use raw query for complex sorting logic efficiently
        const notes = await ctx.prisma.$queryRaw<TrendingNoteRaw[]>`
            SELECT n.*, u.name as "authorName", u.image as "authorImage"
            FROM "Note" n
            JOIN "User" u ON n."authorId" = u.id
            ORDER BY n."voteScore" DESC, n."createdAt" DESC
            LIMIT 20;
        `;

        // Resolve S3 images for author avatars in trending list
        return await Promise.all(
            notes.map(async (n) => {
                const authorImageUrl = n.authorImage && !n.authorImage.startsWith("http")
                    ? await getPresignedDownloadUrl(n.authorImage)
                    : n.authorImage;

                return {
                    ...n,
                    author: {
                        name: n.authorName,
                        image: authorImageUrl,
                    }
                };
            })
        );
    }),
});
