import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const researchProjectRouter = createTRPCRouter({
  // Create a new research project workspace
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.researchProject.create({
        data: {
          title: input.title,
          description: input.description,
          userId: ctx.session.user.id,
        },
      });
    }),

  // Get all projects for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.researchProject.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { projectNotes: true },
        },
      },
    });
  }),

  // Get a single project by ID, including its notes
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.researchProject.findUnique({
        where: { id: input.id },
        include: {
          projectNotes: {
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
            orderBy: { addedAt: "desc" },
          },
        },
      });

      if (!project || project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research project not found or you do not have access.",
        });
      }

      return project;
    }),

  // Delete a research project
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.researchProject.findUnique({
        where: { id: input.id },
      });

      if (!project || project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own research projects.",
        });
      }

      return ctx.prisma.researchProject.delete({
        where: { id: input.id },
      });
    }),

  // Add a note/paper to the project workspace
  addNote: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        noteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.researchProject.findUnique({
        where: { id: input.projectId },
      });

      if (!project || project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        });
      }

      const existing = await ctx.prisma.projectNote.findUnique({
        where: {
            researchProjectId_noteId: {
                researchProjectId: input.projectId,
                noteId: input.noteId,
            }
        }
      });

      if (existing) {
          return existing;
      }

      return ctx.prisma.projectNote.create({
        data: {
          researchProjectId: input.projectId,
          noteId: input.noteId,
        },
      });
    }),

  // Remove a note/paper from the project workspace
  removeNote: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        noteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.researchProject.findUnique({
        where: { id: input.projectId },
      });

      if (!project || project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        });
      }

      return ctx.prisma.projectNote.delete({
        where: {
          researchProjectId_noteId: {
            researchProjectId: input.projectId,
            noteId: input.noteId,
          },
        },
      });
    }),
});