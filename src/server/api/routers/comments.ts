import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

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
            return page?.comments || [];
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
