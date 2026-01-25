import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const adminRouter = createTRPCRouter({
    /**
     * Get platform-wide statistics
     * Auth: Admin only
     */
    getStats: adminProcedure.query(async ({ ctx }) => {
        const [totalUsers, totalNotes, , totalVotes, totalCourses] = await Promise.all([
            ctx.prisma.user.count(),
            ctx.prisma.note.count(),
            ctx.prisma.view.count(),
            ctx.prisma.vote.count(),
            ctx.prisma.course.count(),
        ]);

        // Get stats aggregations
        const noteStats = await ctx.prisma.note.aggregate({
            _sum: {
                viewCount: true,
                voteScore: true,
            },
        });

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [recentNotes, recentUsers, recentViews] = await Promise.all([
            ctx.prisma.note.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.view.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        ]);

        return {
            totalUsers,
            totalNotes,
            totalCourses,
            totalViews: noteStats._sum.viewCount || 0,
            totalVotes,
            totalUpvotes: noteStats._sum.voteScore || 0,
            recentActivity: {
                notes: recentNotes,
                users: recentUsers,
                views: recentViews,
            },
        };
    }),

    /**
     * Get all users with pagination and stats
     * Auth: Admin only
     */
    getAllUsers: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const cursor = input?.cursor;
            const search = input?.search;

            const where = search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" as const } },
                        { email: { contains: search, mode: "insensitive" as const } },
                    ],
                }
                : undefined;

            const users = await ctx.prisma.user.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: {
                            notes: true,
                            comments: true,
                            votes: true,
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (users.length > limit) {
                const nextItem = users.pop();
                nextCursor = nextItem!.id;
            }

            // Get karma for each user and resolve image
            const usersWithKarma = await Promise.all(
                users.map(async (user) => {
                    const noteStats = await ctx.prisma.note.aggregate({
                        where: { authorId: user.id },
                        _sum: { voteScore: true, viewCount: true },
                    });

                    // Resolve image if needed
                    let imageUrl = user.image;
                    if (imageUrl && !imageUrl.startsWith("http")) {
                        imageUrl = await getPresignedDownloadUrl(imageUrl);
                    }

                    return {
                        ...user,
                        image: imageUrl,
                        karma: noteStats._sum.voteScore || 0,
                        totalViews: noteStats._sum.viewCount || 0,
                    };
                })
            );

            return { users: usersWithKarma, nextCursor };
        }),

    /**
     * Update user role
     * Auth: Admin only
     */
    updateUserRole: adminProcedure
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(["USER", "ADMIN"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Prevent self-demotion
            if (input.userId === ctx.session.user.id && input.role === "USER") {
                throw new Error("Cannot demote yourself");
            }

            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { role: input.role },
            });
        }),

    /**
     * Delete any user
     * Auth: Admin only
     */
    deleteUser: adminProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Prevent self-deletion
            if (input.userId === ctx.session.user.id) {
                throw new Error("Cannot delete yourself");
            }

            return ctx.prisma.user.delete({
                where: { id: input.userId },
            });
        }),

    /**
     * Get all notes (including private) with pagination
     * Auth: Admin only
     */
    getAllNotes: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                isPublic: z.boolean().optional(),
                search: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const cursor = input?.cursor;

            const where: {
                isPublic?: boolean;
                OR?: { title: { contains: string; mode: "insensitive" } }[];
            } = {};

            if (input?.isPublic !== undefined) {
                where.isPublic = input.isPublic;
            }

            if (input?.search) {
                where.OR = [
                    { title: { contains: input.search, mode: "insensitive" as const } },
                ];
            }

            const notes = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                    _count: {
                        select: {
                            comments: true,
                            views: true,
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (notes.length > limit) {
                const nextItem = notes.pop();
                nextCursor = nextItem!.id;
            }

            // Resolve author images
            const notesWithImages = await Promise.all(notes.map(async (note) => {
                let authorImage = note.author.image;
                if (authorImage && !authorImage.startsWith("http")) {
                    authorImage = await getPresignedDownloadUrl(authorImage);
                }
                return {
                    ...note,
                    author: { ...note.author, image: authorImage }
                };
            }));

            return { notes: notesWithImages, nextCursor };
        }),

    /**
     * Delete any note (admin override)
     * Auth: Admin only
     */
    deleteNote: adminProcedure
        .input(z.object({ noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.note.delete({
                where: { id: input.noteId },
            });
        }),

    /**
     * Toggle note visibility
     * Auth: Admin only
     */
    toggleNoteVisibility: adminProcedure
        .input(
            z.object({
                noteId: z.string(),
                visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.note.update({
                where: { id: input.noteId },
                data: {
                    visibility: input.visibility,
                    isPublic: input.visibility === "PUBLIC",
                },
            });
        }),

    /**
     * Bulk delete notes
     * Auth: Admin only
     */
    bulkDeleteNotes: adminProcedure
        .input(z.object({ noteIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.note.deleteMany({
                where: { id: { in: input.noteIds } },
            });
        }),

    /**
     * Bulk update user roles
     * Auth: Admin only
     */
    bulkUpdateUserRoles: adminProcedure
        .input(
            z.object({
                userIds: z.array(z.string()),
                role: z.enum(["USER", "ADMIN"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Prevent self-demotion
            if (input.userIds.includes(ctx.session.user.id) && input.role === "USER") {
                throw new Error("Cannot demote yourself");
            }

            return ctx.prisma.user.updateMany({
                where: { id: { in: input.userIds } },
                data: { role: input.role },
            });
        }),

    /**
     * Bulk delete users
     * Auth: Admin only
     */
    bulkDeleteUsers: adminProcedure
        .input(z.object({ userIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            // Prevent self-deletion
            if (input.userIds.includes(ctx.session.user.id)) {
                throw new Error("Cannot delete yourself");
            }

            return ctx.prisma.user.deleteMany({
                where: { id: { in: input.userIds } },
            });
        }),

    // ========================================
    // Course Management
    // ========================================

    /**
     * Get all courses with pagination and stats
     * Auth: Admin only
     */
    getAllCourses: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                search: z.string().optional(),
                branch: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const cursor = input?.cursor;
            const search = input?.search;
            const branch = input?.branch;

            const where: {
                branch?: string;
                OR?: Array<{
                    name?: { contains: string; mode: "insensitive" };
                    code?: { contains: string; mode: "insensitive" };
                }>;
            } = {};

            if (branch) {
                where.branch = branch;
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { code: { contains: search, mode: "insensitive" as const } },
                ];
            }

            const courses = await ctx.prisma.course.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: { code: "asc" },
                include: {
                    _count: {
                        select: {
                            notes: true,
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (courses.length > limit) {
                const nextItem = courses.pop();
                nextCursor = nextItem!.id;
            }

            return { courses, nextCursor };
        }),

    /**
     * Get course statistics
     * Auth: Admin only
     */
    getCourseStats: adminProcedure.query(async ({ ctx }) => {
        const totalCourses = await ctx.prisma.course.count();

        // Get courses grouped by branch
        const coursesByBranch = await ctx.prisma.course.groupBy({
            by: ['branch'],
            _count: {
                branch: true,
            },
            orderBy: {
                branch: 'asc',
            },
        });

        return {
            totalCourses,
            coursesByBranch: coursesByBranch.map(item => ({
                branch: item.branch,
                count: item._count.branch,
            })),
        };
    }),

    /**
     * Create a new course
     * Auth: Admin only
     */
    createCourse: adminProcedure
        .input(
            z.object({
                name: z.string().min(1, "Course name is required"),
                code: z.string().min(1, "Course code is required"),
                branch: z.string().min(1, "Branch is required"),
                description: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if course code already exists
            const existing = await ctx.prisma.course.findUnique({
                where: { code: input.code },
            });

            if (existing) {
                throw new Error(`Course with code ${input.code} already exists`);
            }

            return ctx.prisma.course.create({
                data: {
                    name: input.name,
                    code: input.code,
                    branch: input.branch,
                    description: input.description,
                },
            });
        }),

    /**
     * Update an existing course
     * Auth: Admin only
     */
    updateCourse: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                code: z.string().min(1).optional(),
                branch: z.string().min(1).optional(),
                description: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

            // If updating code, check for conflicts
            if (data.code) {
                const existing = await ctx.prisma.course.findUnique({
                    where: { code: data.code },
                });

                if (existing && existing.id !== id) {
                    throw new Error(`Course with code ${data.code} already exists`);
                }
            }

            return ctx.prisma.course.update({
                where: { id },
                data,
            });
        }),

    /**
     * Delete a course
     * Auth: Admin only
     */
    deleteCourse: adminProcedure
        .input(z.object({
            id: z.string(),
            deleteNotes: z.boolean().default(false), // If true, delete associated notes; if false, just unlink them
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.deleteNotes) {
                // Delete all notes associated with this course
                await ctx.prisma.note.deleteMany({
                    where: { courseId: input.id },
                });
            } else {
                // Just unlink notes from the course
                await ctx.prisma.note.updateMany({
                    where: { courseId: input.id },
                    data: { courseId: null },
                });
            }

            return ctx.prisma.course.delete({
                where: { id: input.id },
            });
        }),

    /**
     * Bulk create courses (import)
     * Auth: Admin only
     */
    bulkCreateCourses: adminProcedure
        .input(
            z.object({
                courses: z.array(
                    z.object({
                        name: z.string().min(1),
                        code: z.string().min(1),
                        branch: z.string().min(1),
                        description: z.string().optional(),
                    })
                ),
                skipDuplicates: z.boolean().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (input.skipDuplicates) {
                // Create courses one by one, skipping duplicates
                const results = [];
                const errors = [];

                for (const course of input.courses) {
                    try {
                        const existing = await ctx.prisma.course.findUnique({
                            where: { code: course.code },
                        });

                        if (!existing) {
                            const created = await ctx.prisma.course.create({
                                data: course,
                            });
                            results.push(created);
                        } else {
                            errors.push(`Skipped duplicate: ${course.code}`);
                        }
                    } catch (error) {
                        errors.push(`Failed to create ${course.code}: ${error}`);
                    }
                }

                return { created: results.length, skipped: errors.length, errors };
            } else {
                // Use createMany which will fail if any duplicate exists
                const result = await ctx.prisma.course.createMany({
                    data: input.courses,
                    skipDuplicates: false,
                });

                return { created: result.count, skipped: 0, errors: [] };
            }
        }),
});
