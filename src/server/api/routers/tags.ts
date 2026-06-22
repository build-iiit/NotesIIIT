import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

export const tagsRouter = createTRPCRouter({
    // Get all tags (default + custom)
    getAll: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.tag.findMany({
                orderBy: [
                    { isDefault: 'desc' },
                    { name: 'asc' }
                ]
            });
        }),

    // Get only default tags
    getDefaults: publicProcedure
        .query(async ({ ctx }) => {
            return ctx.prisma.tag.findMany({
                where: { isDefault: true },
                orderBy: { name: 'asc' }
            });
        }),

    // Create a custom tag
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1).max(50)
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if tag already exists
            const existing = await ctx.prisma.tag.findUnique({
                where: { name: input.name }
            });

            if (existing) {
                return existing;
            }

            return ctx.prisma.tag.create({
                data: {
                    name: input.name,
                    isDefault: false
                }
            });
        }),
});
