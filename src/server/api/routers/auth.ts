import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

export const authRouter = createTRPCRouter({
    /**
     * Get the current user's profile.
     * Auth: Public (returns null if not logged in) or Protected
     */
    getMe: publicProcedure.query(async ({ ctx }) => {
        const user = ctx.session?.user;
        if (!user) return null;

        // Resolve S3 URL for profile image
        let imageUrl = user.image;
        if (user.image && !user.image.startsWith("http")) {
            try {
                imageUrl = await getPresignedDownloadUrl(user.image);
            } catch (e) {
                console.error("Failed to resolve profile image in getMe:", e);
                // Keep original string (or set to null)
            }
        }

        return {
            ...user,
            image: imageUrl,
        };
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
                    backgroundImage: true,
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
                            versions: {
                                orderBy: { version: 'desc' },
                                take: 1,
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

            // Resolve S3 URLs for images
            let imageUrl = user.image;
            if (user.image && !user.image.startsWith("http")) {
                try {
                    imageUrl = await getPresignedDownloadUrl(user.image);
                } catch (e) {
                    console.error("Failed to resolve user image in getProfile:", e);
                }
            }

            let backgroundUrl = user.backgroundImage;
            if (user.backgroundImage && !user.backgroundImage.startsWith("http")) {
                try {
                    backgroundUrl = await getPresignedDownloadUrl(user.backgroundImage);
                } catch (e) {
                    console.error("Failed to resolve background image in getProfile:", e);
                }
            }

            // Resolve thumbnails for notes
            const notesWithThumbnails = await Promise.all(user.notes.map(async (note) => {
                let thumbnailUrl = null;
                const key = (note as any).thumbnailS3Key || note.versions[0]?.thumbnailKey;

                if (key) {
                    try {
                        thumbnailUrl = await getPresignedDownloadUrl(key);
                    } catch (e) {
                        console.error("Failed to generate presigned URL for note", note.id, e);
                    }
                }

                return {
                    ...note,
                    thumbnailUrl
                };
            }));

            return {
                ...user,
                _count: user._count,
                image: imageUrl,
                backgroundImage: backgroundUrl,
                totalViews: stats._sum.viewCount || 0,
                totalKarma: stats._sum.voteScore || 0,
                rank,
                notes: notesWithThumbnails,
            };
        }),

    /**
     * Update the current user's profile.
     * Auth: Protected
     */
    updateProfile: protectedProcedure
        .input(z.object({
            name: z.string().min(1).optional(),
            image: z.string().optional(),
            backgroundImage: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Build update data conditionally to avoid clearing existing values
            const updateData: {
                name?: string;
                image?: string;
                backgroundImage?: string;
            } = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.image !== undefined) updateData.image = input.image;
            if (input.backgroundImage !== undefined) updateData.backgroundImage = input.backgroundImage;

            return ctx.prisma.user.update({
                where: { id: ctx.session.user.id },
                data: updateData,
            });
        }),

    /**
     * Generate S3 Upload URL for profile images.
     * Auth: Protected
     */
    getProfileUploadUrl: protectedProcedure
        .input(z.object({
            filename: z.string(),
            contentType: z.string(),
            type: z.enum(["avatar", "background"])
        }))
        .mutation(async ({ input, ctx }) => {
            const uniqueId = uuidv4();
            const extension = input.filename.split(".").pop();
            const key = `users/${ctx.session.user.id}/${input.type}-${uniqueId}.${extension}`;
            const url = await getPresignedUrl(key, input.contentType);
            return { url, s3Key: key };
        }),

    /**
     * Update the current user's Gemini API key.
     * Auth: Protected
     */
    updateGeminiApiKey: protectedProcedure
        .input(z.object({
            apiKey: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.user.update({
                where: { id: ctx.session.user.id },
                data: { geminiApiKey: input.apiKey },
            });
            return { success: true };
        }),

    /**
     * Check if the current user has a Gemini API key configured.
     * Auth: Protected
     */
    hasGeminiApiKey: protectedProcedure
        .query(async ({ ctx }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.session.user.id },
                select: { geminiApiKey: true },
            });
            return { hasKey: !!user?.geminiApiKey };
        }),
});
