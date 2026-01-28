/**
 * Audit Log Router
 *
 * Provides read-only access to the audit log for super admins.
 * Audit logs are immutable - no update/delete operations are available.
 */

import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "@/server/api/trpc";
import { AuditCategory } from "@prisma/client";

export const auditRouter = createTRPCRouter({
    /**
     * Get paginated audit logs with filters
     * Auth: Super Admin only
     */
    getLogs: superAdminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
                adminId: z.string().optional(),
                action: z.string().optional(),
                category: z.nativeEnum(AuditCategory).optional(),
                targetType: z.string().optional(),
                targetId: z.string().optional(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;

            interface WhereClause {
                adminId?: string;
                action?: { contains: string; mode: "insensitive" };
                category?: AuditCategory;
                targetType?: string;
                targetId?: string;
                createdAt?: { gte?: Date; lte?: Date };
            }
            const where: WhereClause = {};

            if (input?.adminId) where.adminId = input.adminId;
            if (input?.action) where.action = { contains: input.action, mode: "insensitive" };
            if (input?.category) where.category = input.category;
            if (input?.targetType) where.targetType = input.targetType;
            if (input?.targetId) where.targetId = input.targetId;

            if (input?.startDate || input?.endDate) {
                where.createdAt = {};
                if (input?.startDate) where.createdAt.gte = input.startDate;
                if (input?.endDate) where.createdAt.lte = input.endDate;
            }

            const logs = await ctx.prisma.auditLog.findMany({
                where,
                take: limit + 1,
                cursor: input?.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
                include: {
                    admin: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (logs.length > limit) {
                const nextItem = logs.pop();
                nextCursor = nextItem!.id;
            }

            return { logs, nextCursor };
        }),

    /**
     * Get logs for a specific admin
     * Auth: Super Admin only
     */
    getByAdmin: superAdminProcedure
        .input(
            z.object({
                adminId: z.string(),
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const logs = await ctx.prisma.auditLog.findMany({
                where: { adminId: input.adminId },
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
            });

            let nextCursor: string | undefined;
            if (logs.length > input.limit) {
                const nextItem = logs.pop();
                nextCursor = nextItem!.id;
            }

            return { logs, nextCursor };
        }),

    /**
     * Get logs for a specific target entity
     * Auth: Super Admin only
     */
    getByTarget: superAdminProcedure
        .input(
            z.object({
                targetType: z.string(),
                targetId: z.string(),
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const logs = await ctx.prisma.auditLog.findMany({
                where: {
                    targetType: input.targetType,
                    targetId: input.targetId,
                },
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
                include: {
                    admin: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (logs.length > input.limit) {
                const nextItem = logs.pop();
                nextCursor = nextItem!.id;
            }

            return { logs, nextCursor };
        }),

    /**
     * Get a single audit log entry
     * Auth: Super Admin only
     */
    getById: superAdminProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const log = await ctx.prisma.auditLog.findUnique({
                where: { id: input.id },
                include: {
                    admin: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                },
            });

            if (!log) {
                throw new Error("Audit log entry not found");
            }

            return log;
        }),

    /**
     * Get audit log statistics
     * Auth: Super Admin only
     */
    getStats: superAdminProcedure.query(async ({ ctx }) => {
        const [
            totalLogs,
            todayLogs,
            byCategory,
            byAction,
            topAdmins,
        ] = await Promise.all([
            ctx.prisma.auditLog.count(),
            ctx.prisma.auditLog.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            ctx.prisma.auditLog.groupBy({
                by: ["category"],
                _count: { category: true },
                orderBy: { _count: { category: "desc" } },
            }),
            ctx.prisma.auditLog.groupBy({
                by: ["action"],
                _count: { action: true },
                orderBy: { _count: { action: "desc" } },
                take: 10,
            }),
            ctx.prisma.auditLog.groupBy({
                by: ["adminId"],
                _count: { adminId: true },
                orderBy: { _count: { adminId: "desc" } },
                take: 10,
            }),
        ]);

        // Get admin details
        const adminIds = topAdmins.map((a) => a.adminId).filter((id): id is string => id !== null);
        const admins = await ctx.prisma.user.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, name: true, email: true },
        });
        const adminMap = new Map(admins.map((a) => [a.id, a]));

        return {
            total: totalLogs,
            today: todayLogs,
            byCategory: byCategory.map((c) => ({
                category: c.category,
                count: c._count.category,
            })),
            topActions: byAction.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
            topAdmins: topAdmins.map((a) => ({
                admin: a.adminId ? adminMap.get(a.adminId) : null,
                count: a._count.adminId,
            })),
        };
    }),

    /**
     * Get unique action types for filtering
     * Auth: Super Admin only
     */
    getActionTypes: superAdminProcedure.query(async ({ ctx }) => {
        const actions = await ctx.prisma.auditLog.findMany({
            select: { action: true },
            distinct: ["action"],
            orderBy: { action: "asc" },
        });

        return actions.map((a) => a.action);
    }),

    /**
     * Export audit logs (returns data for CSV/JSON export)
     * Auth: Super Admin only
     */
    exportLogs: superAdminProcedure
        .input(
            z.object({
                format: z.enum(["json", "csv"]).default("json"),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
                category: z.nativeEnum(AuditCategory).optional(),
                limit: z.number().max(10000).default(1000),
            })
        )
        .query(async ({ ctx, input }) => {
            interface WhereClause {
                category?: AuditCategory;
                createdAt?: { gte?: Date; lte?: Date };
            }
            const where: WhereClause = {};

            if (input.category) where.category = input.category;
            if (input.startDate || input.endDate) {
                where.createdAt = {};
                if (input.startDate) where.createdAt.gte = input.startDate;
                if (input.endDate) where.createdAt.lte = input.endDate;
            }

            const logs = await ctx.prisma.auditLog.findMany({
                where,
                take: input.limit,
                orderBy: { createdAt: "desc" },
                include: {
                    admin: {
                        select: { email: true, name: true },
                    },
                },
            });

            if (input.format === "csv") {
                // Return CSV-ready data
                const csvRows = logs.map((log) => ({
                    id: log.id,
                    timestamp: log.createdAt.toISOString(),
                    adminEmail: log.adminEmail,
                    adminName: log.admin?.name || "",
                    action: log.action,
                    category: log.category,
                    targetType: log.targetType || "",
                    targetId: log.targetId || "",
                    ipAddress: log.ipAddress || "",
                }));
                return { format: "csv", data: csvRows };
            }

            return { format: "json", data: logs };
        }),
});
