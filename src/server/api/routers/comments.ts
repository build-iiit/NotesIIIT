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

            return ctx.prisma.comment.create({
                data: {
                    content: input.content,
                    userId: ctx.session.user.id,
                    pageId: page.id,
                    parentId: input.parentId,
                    isPrivate: input.isPrivate,
                },
            });
        }),
});
