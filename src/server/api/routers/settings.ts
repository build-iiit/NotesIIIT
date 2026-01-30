/**
 * Platform Settings Router
 *
 * Admin endpoints for viewing and modifying platform-wide settings.
 * Settings are cached for performance and take effect at runtime without redeploy.
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure, createRoleProcedure } from "@/server/api/trpc";
import {
    invalidateSettingsCache,
    seedDefaultSettings,
    DEFAULT_SETTINGS,
} from "@/lib/settings-cache";
import { AuditCategory } from "@prisma/client";

// Procedure that requires ADMIN or above (not just MODERATOR)
const settingsAdminProcedure = createRoleProcedure(["SUPER_ADMIN", "ADMIN"]);

export const settingsRouter = createTRPCRouter({
    /**
     * Get all platform settings grouped by category
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    getAll: settingsAdminProcedure.query(async ({ ctx }) => {
        const settings = await ctx.prisma.platformSetting.findMany({
            orderBy: [{ category: "asc" }, { key: "asc" }],
        });

        // Group by category
        const grouped = settings.reduce(
            (acc, setting) => {
                if (!acc[setting.category]) {
                    acc[setting.category] = [];
                }
                acc[setting.category].push({
                    id: setting.id,
                    key: setting.key,
                    value: setting.value,
                    type: setting.type,
                    description: setting.description,
                    updatedAt: setting.updatedAt,
                });
                return acc;
            },
            {} as Record<
                string,
                {
                    id: string;
                    key: string;
                    value: unknown;
                    type: string;
                    description: string | null;
                    updatedAt: Date;
                }[]
            >
        );

        return grouped;
    }),

    /**
     * Get settings by category
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    getByCategory: settingsAdminProcedure
        .input(z.object({ category: z.string() }))
        .query(async ({ ctx, input }) => {
            const settings = await ctx.prisma.platformSetting.findMany({
                where: { category: input.category },
                orderBy: { key: "asc" },
            });

            return settings.map((s) => ({
                id: s.id,
                key: s.key,
                value: s.value,
                type: s.type,
                description: s.description,
                updatedAt: s.updatedAt,
            }));
        }),

    /**
     * Update a single setting
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    update: settingsAdminProcedure
        .input(
            z.object({
                key: z.string(),
                value: z.unknown(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Get current value for audit log
            const current = await ctx.prisma.platformSetting.findUnique({
                where: { key: input.key },
            });

            if (!current) {
                throw new Error(`Setting "${input.key}" not found`);
            }

            // Update setting
            const updated = await ctx.prisma.platformSetting.update({
                where: { key: input.key },
                data: {
                    value: input.value as never,
                    updatedBy: ctx.session.user.id,
                },
            });

            // Create audit log
            await ctx.prisma.auditLog.create({
                data: {
                    adminId: ctx.session.user.id,
                    adminEmail: ctx.session.user.email || "unknown",
                    action: "settings.update",
                    category: AuditCategory.SETTINGS,
                    targetType: "PlatformSetting",
                    targetId: current.id,
                    beforeState: { key: input.key, value: current.value as string | number | boolean | null },
                    afterState: { key: input.key, value: input.value as string | number | boolean | null },
                    ipAddress: ctx.headers.get("x-forwarded-for"),
                    userAgent: ctx.headers.get("user-agent"),
                },
            });

            // Invalidate cache
            invalidateSettingsCache(input.key);

            return {
                key: updated.key,
                value: updated.value,
                updatedAt: updated.updatedAt,
            };
        }),

    /**
     * Bulk update multiple settings
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    bulkUpdate: settingsAdminProcedure
        .input(
            z.object({
                settings: z.array(
                    z.object({
                        key: z.string(),
                        value: z.unknown(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const results = [];

            for (const setting of input.settings) {
                const current = await ctx.prisma.platformSetting.findUnique({
                    where: { key: setting.key },
                });

                if (!current) continue;

                const updated = await ctx.prisma.platformSetting.update({
                    where: { key: setting.key },
                    data: {
                        value: setting.value as never,
                        updatedBy: ctx.session.user.id,
                    },
                });

                // Create audit log
                await ctx.prisma.auditLog.create({
                    data: {
                        adminId: ctx.session.user.id,
                        adminEmail: ctx.session.user.email || "unknown",
                        action: "settings.bulkUpdate",
                        category: AuditCategory.SETTINGS,
                        targetType: "PlatformSetting",
                        targetId: current.id,
                        beforeState: { key: setting.key, value: current.value as string | number | boolean | null },
                        afterState: { key: setting.key, value: setting.value as string | number | boolean | null },
                    },
                });

                results.push({ key: updated.key, value: updated.value });
            }

            // Invalidate entire cache
            invalidateSettingsCache();

            return { updated: results.length, settings: results };
        }),

    /**
     * Seed default settings (if they don't exist)
     * Auth: Super Admin only
     */
    seedDefaults: createRoleProcedure(["SUPER_ADMIN"]).mutation(async ({ ctx }) => {
        await seedDefaultSettings();

        // Create audit log
        await ctx.prisma.auditLog.create({
            data: {
                adminId: ctx.session.user.id,
                adminEmail: ctx.session.user.email || "unknown",
                action: "settings.seedDefaults",
                category: AuditCategory.SETTINGS,
                metadata: { settingsCount: DEFAULT_SETTINGS.length },
            },
        });

        return { success: true, count: DEFAULT_SETTINGS.length };
    }),

    /**
     * Get setting categories with counts
     * Auth: Admin+ (ADMIN or SUPER_ADMIN)
     */
    getCategories: settingsAdminProcedure.query(async ({ ctx }) => {
        const categories = await ctx.prisma.platformSetting.groupBy({
            by: ["category"],
            _count: { category: true },
            orderBy: { category: "asc" },
        });

        return categories.map((c) => ({
            name: c.category,
            count: c._count.category,
        }));
    }),

    /**
     * Get public settings (for frontend feature flags)
     * Auth: Public (no auth required)
     */
    getPublic: adminProcedure.query(async ({ ctx }) => {
        // Only return non-sensitive settings
        const publicKeys = [
            "maintenance.enabled",
            "maintenance.message",
            "features.aiAssistant",
            "features.requestBoard",
            "features.social",
            "registration.enabled",
        ];

        const settings = await ctx.prisma.platformSetting.findMany({
            where: { key: { in: publicKeys } },
        });

        return settings.reduce(
            (acc, s) => {
                acc[s.key] = s.value;
                return acc;
            },
            {} as Record<string, unknown>
        );
    }),
});
