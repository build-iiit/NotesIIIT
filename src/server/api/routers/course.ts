import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

export const courseRouter = createTRPCRouter({
    // Get all courses, optionally grouped by branch (logic handled in frontend usually, but we return flat list here)
    getAll: publicProcedure.query(async ({ ctx }) => {
        return ctx.prisma.course.findMany({
            orderBy: {
                code: "asc",
            },
        });
    }),

    // Get a single course by ID with its notes
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const course = await ctx.prisma.course.findUnique({
                where: { id: input.id },
                include: {
                    _count: {
                        select: { notes: true },
                    },
                },
            });
            return course;
        }),

    // Get courses by branch
    getByBranch: publicProcedure
        .input(z.object({ branch: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.course.findMany({
                where: {
                    branch: input.branch,
                },
                orderBy: {
                    code: "asc",
                },
            });
        }),

    // Get all unique branches
    getBranches: publicProcedure.query(async ({ ctx }) => {
        const branches = await ctx.prisma.course.findMany({
            select: {
                branch: true,
            },
            distinct: ['branch'],
            orderBy: {
                branch: 'asc',
            },
        });
        return branches.map((b: { branch: string }) => b.branch);
    }),
});
