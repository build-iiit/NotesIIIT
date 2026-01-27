import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const notificationsRouter = createTRPCRouter({
    /**
     * Get all notifications for the current user (paginated).
     * Auth: Protected
     */
    getAll: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(20),
            cursor: z.string().optional(), // For pagination
        }))
        .query(async ({ ctx, input }) => {
            const notifications = await ctx.prisma.notification.findMany({
                where: { userId: ctx.session.user.id },
                orderBy: { createdAt: "desc" },
                take: input.limit + 1, // Fetch one extra for cursor
                cursor: input.cursor ? { id: input.cursor } : undefined,
                include: {
                    actor: {
                        select: { id: true, name: true, image: true }
                    }
                }
            });

            let nextCursor: string | undefined = undefined;
            if (notifications.length > input.limit) {
                const nextItem = notifications.pop();
                nextCursor = nextItem?.id;
            }

            // Resolve actor images
            const notificationsWithImages = await Promise.all(
                notifications.map(async (notification) => {
                    if (notification.actor?.image && !notification.actor.image.startsWith("http")) {
                        notification.actor.image = await getPresignedDownloadUrl(notification.actor.image);
                    }
                    return notification;
                })
            );

            return {
                notifications: notificationsWithImages,
                nextCursor,
            };
        }),

    /**
     * Get the count of unread notifications.
     * Auth: Protected
     */
    getUnreadCount: protectedProcedure
        .query(async ({ ctx }) => {
            const count = await ctx.prisma.notification.count({
                where: {
                    userId: ctx.session.user.id,
                    isRead: false,
                }
            });
            return { count };
        }),

    /**
     * Mark a single notification as read.
     * Auth: Protected
     */
    markAsRead: protectedProcedure
        .input(z.object({ notificationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.notification.updateMany({
                where: {
                    id: input.notificationId,
                    userId: ctx.session.user.id, // Ensure user owns this notification
                },
                data: { isRead: true }
            });
            return { success: true };
        }),

    /**
     * Mark all notifications as read.
     * Auth: Protected
     */
    markAllAsRead: protectedProcedure
        .mutation(async ({ ctx }) => {
            await ctx.prisma.notification.updateMany({
                where: {
                    userId: ctx.session.user.id,
                    isRead: false,
                },
                data: { isRead: true }
            });
            return { success: true };
        }),

    /**
     * Get recent notifications (for SSE polling).
     * Auth: Protected
     */
    getRecent: protectedProcedure
        .input(z.object({
            since: z.date().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const notifications = await ctx.prisma.notification.findMany({
                where: {
                    userId: ctx.session.user.id,
                    ...(input.since ? { createdAt: { gt: input.since } } : {}),
                },
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    actor: {
                        select: { id: true, name: true, image: true }
                    }
                }
            });

            // Resolve actor images
            const notificationsWithImages = await Promise.all(
                notifications.map(async (notification) => {
                    if (notification.actor?.image && !notification.actor.image.startsWith("http")) {
                        notification.actor.image = await getPresignedDownloadUrl(notification.actor.image);
                    }
                    return notification;
                })
            );

            return notificationsWithImages;
        }),
});
