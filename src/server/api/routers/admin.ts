import { z } from "zod";
import { createTRPCRouter, adminProcedure, superAdminProcedure, createRoleProcedure, canActOnRole } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { AuditCategory, Role, UserStatus } from "@prisma/client";

export const adminRouter = createTRPCRouter({
    /**
     * Get platform-wide statistics with growth trends
     * Auth: Admin only
     */
    getStats: adminProcedure.query(async ({ ctx }) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previousWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Core counts
        const [totalUsers, totalNotes, totalViews, totalVotes, totalCourses, totalComments] = await Promise.all([
            ctx.prisma.user.count(),
            ctx.prisma.note.count(),
            ctx.prisma.view.count(),
            ctx.prisma.vote.count(),
            ctx.prisma.course.count(),
            ctx.prisma.comment.count(),
        ]);

        // Get stats aggregations
        const noteStats = await ctx.prisma.note.aggregate({
            _sum: {
                viewCount: true,
                voteScore: true,
            },
        });

        // Recent activity (last 7 days)
        const [recentNotes, recentUsers, recentViews, recentComments] = await Promise.all([
            ctx.prisma.note.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.view.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            ctx.prisma.comment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        ]);

        // Previous week for growth calculation
        const [prevWeekNotes, prevWeekUsers, prevWeekViews] = await Promise.all([
            ctx.prisma.note.count({ where: { createdAt: { gte: previousWeek, lt: sevenDaysAgo } } }),
            ctx.prisma.user.count({ where: { createdAt: { gte: previousWeek, lt: sevenDaysAgo } } }),
            ctx.prisma.view.count({ where: { createdAt: { gte: previousWeek, lt: sevenDaysAgo } } }),
        ]);

        // Last 30 days for trends
        const [monthlyNotes, monthlyUsers, monthlyViews] = await Promise.all([
            ctx.prisma.note.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            ctx.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            ctx.prisma.view.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        ]);

        // User breakdown by role
        const usersByRole = await ctx.prisma.user.groupBy({
            by: ["role"],
            _count: { role: true },
        });

        // User breakdown by status
        const usersByStatus = await ctx.prisma.user.groupBy({
            by: ["status"],
            _count: { status: true },
        });

        // Moderation stats
        const [pendingReports, hiddenNotes, suspendedUsers, bannedUsers] = await Promise.all([
            ctx.prisma.report.count({ where: { status: "PENDING" } }),
            ctx.prisma.note.count({ where: { moderationStatus: "HIDDEN" } }),
            ctx.prisma.user.count({ where: { status: "SUSPENDED" } }),
            ctx.prisma.user.count({ where: { status: "BANNED" } }),
        ]);

        // Top contributors (by note count in last 30 days)
        const topContributors = await ctx.prisma.user.findMany({
            where: {
                notes: {
                    some: {
                        createdAt: { gte: thirtyDaysAgo },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                _count: {
                    select: {
                        notes: {
                            where: { createdAt: { gte: thirtyDaysAgo } },
                        },
                    },
                },
            },
            orderBy: {
                notes: {
                    _count: "desc",
                },
            },
            take: 5,
        });

        // Calculate growth percentages
        const calculateGrowth = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            totalUsers,
            totalNotes,
            totalCourses,
            totalViews: noteStats._sum.viewCount || 0,
            totalVotes,
            totalUpvotes: noteStats._sum.voteScore || 0,
            totalComments,
            recentActivity: {
                notes: recentNotes,
                users: recentUsers,
                views: recentViews,
                comments: recentComments,
            },
            growth: {
                notes: calculateGrowth(recentNotes, prevWeekNotes),
                users: calculateGrowth(recentUsers, prevWeekUsers),
                views: calculateGrowth(recentViews, prevWeekViews),
            },
            monthly: {
                notes: monthlyNotes,
                users: monthlyUsers,
                views: monthlyViews,
            },
            userBreakdown: {
                byRole: usersByRole.map(r => ({ role: r.role, count: r._count.role })),
                byStatus: usersByStatus.map(s => ({ status: s.status, count: s._count.status })),
            },
            moderation: {
                pendingReports,
                hiddenNotes,
                suspendedUsers,
                bannedUsers,
            },
            topContributors: topContributors.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                notesThisMonth: c._count.notes,
            })),
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
                role: z.nativeEnum(Role),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Prevent self-demotion
            if (input.userId === ctx.session.user.id && input.role === "USER") {
                throw new Error("Cannot demote yourself");
            }

            // Check if the current admin can assign this role
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
                select: { role: true },
            });

            if (!targetUser) throw new Error("User not found");

            // Prevent assigning higher or equal role than your own
            const actorRole = ctx.session.user.role as Role;
            if (!canActOnRole(actorRole, targetUser.role as Role)) {
                throw new Error("Cannot modify a user with equal or higher privileges");
            }

            // Only SUPER_ADMIN can assign SUPER_ADMIN or ADMIN roles
            if ((input.role === "SUPER_ADMIN" || input.role === "ADMIN") && actorRole !== "SUPER_ADMIN") {
                throw new Error("Only SUPER_ADMIN can assign admin roles");
            }

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "user.updateRole",
                    category: AuditCategory.USER_MANAGEMENT,
                    targetType: "User",
                    targetId: input.userId,
                    beforeState: { role: targetUser.role },
                    afterState: { role: input.role },
                },
            });

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
    // Enhanced User Management (Evolution)
    // ========================================

    /**
     * Suspend a user temporarily
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    suspendUser: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(
            z.object({
                userId: z.string(),
                reason: z.string().max(500),
                durationDays: z.number().min(1).max(365).optional(), // null = indefinite
            })
        )
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
            });

            if (!targetUser) throw new Error("User not found");

            // Cannot suspend admins unless super admin
            if (!canActOnRole(ctx.session.user.role as string, targetUser.role as string)) {
                throw new Error("Cannot suspend a user with equal or higher privileges");
            }

            const suspendedUntil = input.durationDays
                ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
                : null;

            const updated = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: {
                    status: "SUSPENDED" as UserStatus,
                    suspendedAt: new Date(),
                    suspendedUntil,
                    banReason: input.reason,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "user.suspend",
                    category: AuditCategory.USER_MANAGEMENT,
                    targetType: "User",
                    targetId: input.userId,
                    beforeState: { status: targetUser.status },
                    afterState: {
                        status: "SUSPENDED",
                        suspendedUntil: suspendedUntil?.toISOString(),
                        reason: input.reason
                    },
                },
            });

            return { success: true, user: updated };
        }),

    /**
     * Permanently ban a user
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    banUser: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(
            z.object({
                userId: z.string(),
                reason: z.string().max(500),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
            });

            if (!targetUser) throw new Error("User not found");

            if (!canActOnRole(ctx.session.user.role as string, targetUser.role as string)) {
                throw new Error("Cannot ban a user with equal or higher privileges");
            }

            const updated = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: {
                    status: "BANNED" as UserStatus,
                    suspendedAt: new Date(),
                    suspendedUntil: null, // Permanent
                    banReason: input.reason,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "user.ban",
                    category: AuditCategory.USER_MANAGEMENT,
                    targetType: "User",
                    targetId: input.userId,
                    beforeState: { status: targetUser.status },
                    afterState: { status: "BANNED", reason: input.reason },
                },
            });

            return { success: true, user: updated };
        }),

    /**
     * Shadow ban a user (hide their content from public but they don't know)
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    shadowBanUser: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(
            z.object({
                userId: z.string(),
                reason: z.string().max(500),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
            });

            if (!targetUser) throw new Error("User not found");

            if (!canActOnRole(ctx.session.user.role as string, targetUser.role as string)) {
                throw new Error("Cannot shadow ban a user with equal or higher privileges");
            }

            const updated = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: {
                    shadowBanned: true,
                    banReason: input.reason,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "user.shadowBan",
                    category: AuditCategory.USER_MANAGEMENT,
                    targetType: "User",
                    targetId: input.userId,
                    beforeState: { shadowBanned: targetUser.shadowBanned },
                    afterState: { shadowBanned: true, reason: input.reason },
                },
            });

            return { success: true, user: updated };
        }),

    /**
     * Reinstate a suspended/banned user
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    reinstateUser: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
            });

            if (!targetUser) throw new Error("User not found");

            const updated = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: {
                    status: "ACTIVE" as UserStatus,
                    suspendedAt: null,
                    suspendedUntil: null,
                    banReason: null,
                    shadowBanned: false,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "user.reinstate",
                    category: AuditCategory.USER_MANAGEMENT,
                    targetType: "User",
                    targetId: input.userId,
                    beforeState: {
                        status: targetUser.status,
                        shadowBanned: targetUser.shadowBanned
                    },
                    afterState: { status: "ACTIVE", shadowBanned: false },
                },
            });

            return { success: true, user: updated };
        }),

    /**
     * Get user activity summary (notes, reports, karma)
     * Auth: Moderator+
     */
    getUserActivity: adminProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
                include: {
                    _count: {
                        select: {
                            notes: true,
                            comments: true,
                            votes: true,
                            reportsMade: true,
                        },
                    },
                },
            });

            if (!user) throw new Error("User not found");

            // Get karma (total vote score on user's notes)
            const noteStats = await ctx.prisma.note.aggregate({
                where: { authorId: input.userId },
                _sum: { voteScore: true, viewCount: true },
            });

            // Get reports against this user
            const reportsAgainst = await ctx.prisma.report.count({
                where: {
                    targetType: "USER",
                    targetId: input.userId
                },
            });

            // Get recent notes
            const recentNotes = await ctx.prisma.note.findMany({
                where: { authorId: input.userId },
                take: 10,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    noteType: true,
                    createdAt: true,
                    voteScore: true,
                    moderationStatus: true,
                },
            });

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    shadowBanned: user.shadowBanned,
                    createdAt: user.createdAt,
                },
                counts: user._count,
                karma: noteStats._sum.voteScore || 0,
                totalViews: noteStats._sum.viewCount || 0,
                reportsAgainst,
                recentNotes,
            };
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

    // ========================================
    // Content Moderation (Evolution)
    // ========================================

    /**
     * Hide a note from public view
     * Auth: Moderator+
     */
    hideNote: adminProcedure
        .input(
            z.object({
                noteId: z.string(),
                reason: z.string().max(500),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
                select: { id: true, title: true, moderationStatus: true },
            });

            if (!note) throw new Error("Note not found");

            const updated = await ctx.prisma.note.update({
                where: { id: input.noteId },
                data: {
                    moderationStatus: "HIDDEN",
                    moderatedAt: new Date(),
                    moderatedBy: ctx.session.user.id,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "note.hide",
                    category: AuditCategory.CONTENT_MODERATION,
                    targetType: "Note",
                    targetId: input.noteId,
                    beforeState: { moderationStatus: note.moderationStatus },
                    afterState: { moderationStatus: "HIDDEN", reason: input.reason },
                },
            });

            return { success: true, note: updated };
        }),

    /**
     * Lock a note (prevent edits)
     * Auth: Moderator+
     */
    lockNote: adminProcedure
        .input(
            z.object({
                noteId: z.string(),
                locked: z.boolean(),
                reason: z.string().max(500).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
                select: { id: true, title: true, isLocked: true },
            });

            if (!note) throw new Error("Note not found");

            const updated = await ctx.prisma.note.update({
                where: { id: input.noteId },
                data: {
                    isLocked: input.locked,
                    moderatedAt: new Date(),
                    moderatedBy: ctx.session.user.id,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: input.locked ? "note.lock" : "note.unlock",
                    category: AuditCategory.CONTENT_MODERATION,
                    targetType: "Note",
                    targetId: input.noteId,
                    beforeState: { isLocked: note.isLocked },
                    afterState: { isLocked: input.locked, reason: input.reason },
                },
            });

            return { success: true, note: updated };
        }),

    /**
     * Feature a note (highlight on leaderboard/home)
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    featureNote: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(
            z.object({
                noteId: z.string(),
                featured: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
                select: { id: true, title: true, isFeatured: true },
            });

            if (!note) throw new Error("Note not found");

            const updated = await ctx.prisma.note.update({
                where: { id: input.noteId },
                data: { isFeatured: input.featured },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: input.featured ? "note.feature" : "note.unfeature",
                    category: AuditCategory.CONTENT_MODERATION,
                    targetType: "Note",
                    targetId: input.noteId,
                    beforeState: { isFeatured: note.isFeatured },
                    afterState: { isFeatured: input.featured },
                },
            });

            return { success: true, note: updated };
        }),

    /**
     * Pin a note to the top of a course/folder
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    pinNote: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(
            z.object({
                noteId: z.string(),
                pinned: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
                select: { id: true, title: true, isPinned: true },
            });

            if (!note) throw new Error("Note not found");

            const updated = await ctx.prisma.note.update({
                where: { id: input.noteId },
                data: { isPinned: input.pinned },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: input.pinned ? "note.pin" : "note.unpin",
                    category: AuditCategory.CONTENT_MODERATION,
                    targetType: "Note",
                    targetId: input.noteId,
                    beforeState: { isPinned: note.isPinned },
                    afterState: { isPinned: input.pinned },
                },
            });

            return { success: true, note: updated };
        }),

    /**
     * Restore a hidden/deleted note to visible
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    restoreNote: createRoleProcedure(["SUPER_ADMIN", "ADMIN"])
        .input(z.object({ noteId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.noteId },
                select: { id: true, title: true, moderationStatus: true },
            });

            if (!note) throw new Error("Note not found");

            const updated = await ctx.prisma.note.update({
                where: { id: input.noteId },
                data: {
                    moderationStatus: "VISIBLE",
                    moderatedAt: new Date(),
                    moderatedBy: ctx.session.user.id,
                },
            });

            // Audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "note.restore",
                    category: AuditCategory.CONTENT_MODERATION,
                    targetType: "Note",
                    targetId: input.noteId,
                    beforeState: { moderationStatus: note.moderationStatus },
                    afterState: { moderationStatus: "VISIBLE" },
                },
            });

            return { success: true, note: updated };
        }),

    /**
     * Get moderation history for content
     * Auth: Moderator+
     */
    getModerationHistory: adminProcedure
        .input(
            z.object({
                targetType: z.enum(["User", "Note", "Comment"]),
                targetId: z.string(),
                limit: z.number().min(1).max(50).default(20),
            })
        )
        .query(async ({ ctx, input }) => {
            const logs = await ctx.prisma.auditLog.findMany({
                where: {
                    targetType: input.targetType,
                    targetId: input.targetId,
                    category: AuditCategory.CONTENT_MODERATION,
                },
                orderBy: { createdAt: "desc" },
                take: input.limit,
                include: {
                    admin: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            return logs;
        }),

    /**
     * Get notes under review or hidden
     * Auth: Moderator+
     */
    getModerationQueue: adminProcedure
        .input(
            z.object({
                status: z.enum(["HIDDEN", "UNDER_REVIEW", "DELETED"]).optional(),
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;

            const notes = await ctx.prisma.note.findMany({
                where: {
                    moderationStatus: input?.status
                        ? input.status
                        : { in: ["HIDDEN", "UNDER_REVIEW", "DELETED"] },
                },
                take: limit + 1,
                cursor: input?.cursor ? { id: input.cursor } : undefined,
                orderBy: { moderatedAt: "desc" },
                include: {
                    author: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (notes.length > limit) {
                const nextItem = notes.pop();
                nextCursor = nextItem!.id;
            }

            return { notes, nextCursor };
        }),

    /**
     * Get system health and storage statistics
     * Auth: Admin only
     */
    getSystemHealth: adminProcedure.query(async ({ ctx }) => {
        // Get database table counts for sizing estimation
        const [
            userCount,
            noteCount,
            commentCount,
            viewCount,
            voteCount,
            reportCount,
            auditLogCount,
            courseCount,
        ] = await Promise.all([
            ctx.prisma.user.count(),
            ctx.prisma.note.count(),
            ctx.prisma.comment.count(),
            ctx.prisma.view.count(),
            ctx.prisma.vote.count(),
            ctx.prisma.report.count(),
            ctx.prisma.auditLog.count(),
            ctx.prisma.course.count(),
        ]);

        // Get note storage estimates (based on content size)
        const noteStorageStats = await ctx.prisma.note.aggregate({
            _avg: { viewCount: true },
            _max: { viewCount: true },
        });

        // Get recent activity for health indicators
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [recentLogins, recentNotes, recentViews] = await Promise.all([
            ctx.prisma.user.count({
                where: { updatedAt: { gte: oneHourAgo } },
            }),
            ctx.prisma.note.count({
                where: { createdAt: { gte: oneDayAgo } },
            }),
            ctx.prisma.view.count({
                where: { createdAt: { gte: oneDayAgo } },
            }),
        ]);

        // Get error-related data (moderation queue items)
        const [pendingReports, hiddenContent] = await Promise.all([
            ctx.prisma.report.count({ where: { status: "PENDING" } }),
            ctx.prisma.note.count({ where: { moderationStatus: { in: ["HIDDEN", "UNDER_REVIEW"] } } }),
        ]);

        return {
            database: {
                tables: [
                    { name: "Users", count: userCount },
                    { name: "Notes", count: noteCount },
                    { name: "Comments", count: commentCount },
                    { name: "Views", count: viewCount },
                    { name: "Votes", count: voteCount },
                    { name: "Reports", count: reportCount },
                    { name: "Audit Logs", count: auditLogCount },
                    { name: "Courses", count: courseCount },
                ],
                totalRecords: userCount + noteCount + commentCount + viewCount + voteCount + reportCount + auditLogCount + courseCount,
            },
            activity: {
                activeUsersLastHour: recentLogins,
                newNotesToday: recentNotes,
                viewsToday: recentViews,
            },
            health: {
                status: pendingReports > 10 ? "warning" : "healthy",
                pendingReports,
                hiddenContent,
                avgViews: noteStorageStats._avg.viewCount || 0,
                maxViews: noteStorageStats._max.viewCount || 0,
            },
            timestamp: now.toISOString(),
        };
    }),
});
