import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const survivalGuideRouter = createTRPCRouter({
  // Create a new survival guide
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        courseId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure course exists
      const course = await ctx.prisma.course.findUnique({
        where: { id: input.courseId },
      });
      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      return ctx.prisma.survivalGuide.create({
        data: {
          title: input.title,
          description: input.description,
          courseId: input.courseId,
          authorId: ctx.session.user.id,
        },
      });
    }),

  // Get all guides for a specific course
  getByCourse: publicProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.survivalGuide.findMany({
        where: { courseId: input.courseId },
        orderBy: { upvotes: { _count: "desc" } },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { upvotes: true, guideNotes: true },
          },
        },
      });
    }),

  // Get a single guide by ID, including its notes
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const guide = await ctx.prisma.survivalGuide.findUnique({
        where: { id: input.id },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { upvotes: true },
          },
          guideNotes: {
            include: {
              note: {
                select: {
                  id: true,
                  title: true,
                  noteType: true,
                  createdAt: true,
                  author: {
                    select: {
                      name: true,
                      image: true,
                    },
                  },
                },
              },
            },
            orderBy: { addedAt: "asc" },
          },
        },
      });

      if (!guide) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Survival guide not found.",
        });
      }

      // Check if current user has upvoted
      let hasUpvoted = false;
      if (ctx.session?.user) {
        const upvote = await ctx.prisma.guideUpvote.findUnique({
          where: {
            userId_survivalGuideId: {
              userId: ctx.session.user.id,
              survivalGuideId: guide.id,
            },
          },
        });
        hasUpvoted = !!upvote;
      }

      return {
        ...guide,
        hasUpvoted,
      };
    }),

  // Delete a guide
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const guide = await ctx.prisma.survivalGuide.findUnique({
        where: { id: input.id },
      });

      if (!guide || guide.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own guides.",
        });
      }

      return ctx.prisma.survivalGuide.delete({
        where: { id: input.id },
      });
    }),

  // Add a note to the guide
  addNote: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        noteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const guide = await ctx.prisma.survivalGuide.findUnique({
        where: { id: input.guideId },
      });

      if (!guide || guide.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this guide.",
        });
      }

      const existing = await ctx.prisma.guideNote.findUnique({
        where: {
          survivalGuideId_noteId: {
            survivalGuideId: input.guideId,
            noteId: input.noteId,
          },
        },
      });

      if (existing) return existing;

      return ctx.prisma.guideNote.create({
        data: {
          survivalGuideId: input.guideId,
          noteId: input.noteId,
        },
      });
    }),

  // Remove a note from the guide
  removeNote: protectedProcedure
    .input(
      z.object({
        guideId: z.string(),
        noteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const guide = await ctx.prisma.survivalGuide.findUnique({
        where: { id: input.guideId },
      });

      if (!guide || guide.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this guide.",
        });
      }

      return ctx.prisma.guideNote.delete({
        where: {
          survivalGuideId_noteId: {
            survivalGuideId: input.guideId,
            noteId: input.noteId,
          },
        },
      });
    }),

  // Toggle upvote on a guide
  toggleUpvote: protectedProcedure
    .input(z.object({ guideId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.guideUpvote.findUnique({
        where: {
          userId_survivalGuideId: {
            userId: ctx.session.user.id,
            survivalGuideId: input.guideId,
          },
        },
      });

      if (existing) {
        await ctx.prisma.guideUpvote.delete({
          where: { id: existing.id },
        });
        return { upvoted: false };
      } else {
        await ctx.prisma.guideUpvote.create({
          data: {
            userId: ctx.session.user.id,
            survivalGuideId: input.guideId,
          },
        });
        return { upvoted: true };
      }
    }),
});