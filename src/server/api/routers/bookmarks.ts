import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const bookmarksRouter = createTRPCRouter({
    /**
     * Toggle bookmark for a specific page
     * Creates if doesn't exist, deletes if exists
     * Auth: Protected
     */
    toggle: protectedProcedure
        .input(
            z.object({
                noteId: z.string(),
                pageNumber: z.number().int().positive(),
                label: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existingBookmark = await ctx.prisma.bookmark.findUnique({
                where: {
                    userId_noteId_pageNumber: {
                        userId: ctx.session.user.id,
                        noteId: input.noteId,
                        pageNumber: input.pageNumber,
                    },
                },
            });

            if (existingBookmark) {
                // Delete existing bookmark
                await ctx.prisma.bookmark.delete({
                    where: { id: existingBookmark.id },
                });
                return { action: "removed", bookmark: null };
            } else {
                // Create new bookmark
                const bookmark = await ctx.prisma.bookmark.create({
                    data: {
                        userId: ctx.session.user.id,
                        noteId: input.noteId,
                        pageNumber: input.pageNumber,
                        label: input.label,
                    },
                });
                return { action: "created", bookmark };
            }
        }),

    /**
     * Get all bookmarks for a specific note (for the current user)
     * Auth: Protected
     */
    getForNote: protectedProcedure
        .input(z.object({ noteId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.bookmark.findMany({
                where: {
                    userId: ctx.session.user.id,
                    noteId: input.noteId,
                },
                orderBy: { pageNumber: "asc" },
            });
        }),

    /**
     * Get all bookmarks for the current user
     * Auth: Protected
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.bookmark.findMany({
            where: {
                userId: ctx.session.user.id,
            },
            include: {
                note: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }),

    /**
     * Delete a bookmark
     * Auth: Protected
     */
    delete: protectedProcedure
        .input(z.object({ bookmarkId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Verify ownership
            const bookmark = await ctx.prisma.bookmark.findUnique({
                where: { id: input.bookmarkId },
            });

            if (!bookmark || bookmark.userId !== ctx.session.user.id) {
                throw new Error("Bookmark not found or unauthorized");
            }

            return ctx.prisma.bookmark.delete({
                where: { id: input.bookmarkId },
            });
        }),
});
