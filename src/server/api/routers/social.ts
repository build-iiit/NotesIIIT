import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedDownloadUrl } from "@/lib/s3";

export const socialRouter = createTRPCRouter({
    // --- 1. User Search & Friends ---

    searchUsers: protectedProcedure
        .input(z.object({ query: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const users = await ctx.prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: input.query, mode: "insensitive" } },
                        { email: { contains: input.query, mode: "insensitive" } }
                    ],
                    NOT: { id: ctx.session.user.id }
                },
                take: 10,
                select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true
                }
            });

            // Resolve images
            return await Promise.all(users.map(async (user) => {
                if (user.image && !user.image.startsWith("http")) {
                    user.image = await getPresignedDownloadUrl(user.image);
                }
                return user;
            }));
        }),

    sendFriendRequest: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.prisma.friendRequest.findFirst({
                where: {
                    OR: [
                        { senderId: ctx.session.user.id, receiverId: input.userId },
                        { senderId: input.userId, receiverId: ctx.session.user.id }
                    ]
                }
            });

            if (existing) {
                if (existing.status === "PENDING") throw new TRPCError({ code: "CONFLICT", message: "Request pending" });
                if (existing.status === "ACCEPTED") throw new TRPCError({ code: "CONFLICT", message: "Already friends" });
                // If REJECTED, maybe allow re-request? For now block.
                throw new TRPCError({ code: "CONFLICT", message: "Request exists" });
            }

            return ctx.prisma.friendRequest.create({
                data: {
                    senderId: ctx.session.user.id,
                    receiverId: input.userId,
                }
            });
        }),

    getFriendRequests: protectedProcedure
        .query(async ({ ctx }) => {
            const requests = await ctx.prisma.friendRequest.findMany({
                where: {
                    receiverId: ctx.session.user.id,
                    status: "PENDING"
                },
                include: {
                    sender: {
                        select: { id: true, name: true, image: true }
                    }
                }
            });

            // Resolve images
            return await Promise.all(requests.map(async (req) => {
                if (req.sender.image && !req.sender.image.startsWith("http")) {
                    req.sender.image = await getPresignedDownloadUrl(req.sender.image);
                }
                return req;
            }));
        }),

    respondToRequest: protectedProcedure
        .input(z.object({ requestId: z.string(), status: z.enum(["ACCEPTED", "REJECTED"]) }))
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.friendRequest.findUnique({
                where: { id: input.requestId }
            });

            if (!request || request.receiverId !== ctx.session.user.id) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
            }

            if (input.status === "REJECTED") {
                return ctx.prisma.friendRequest.delete({ where: { id: input.requestId } });
            }

            return ctx.prisma.friendRequest.update({
                where: { id: input.requestId },
                data: { status: "ACCEPTED" }
            });
        }),

    getFriends: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.session.user.id;
            const requests = await ctx.prisma.friendRequest.findMany({
                where: {
                    status: "ACCEPTED",
                    OR: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                },
                include: {
                    sender: { select: { id: true, name: true, image: true } },
                    receiver: { select: { id: true, name: true, image: true } }
                }
            });

            return await Promise.all(requests.map(async (req) => {
                const friend = req.senderId === userId ? req.receiver : req.sender;
                if (friend.image && !friend.image.startsWith("http")) {
                    friend.image = await getPresignedDownloadUrl(friend.image);
                }
                return friend;
            }));
        }),

    // --- 2. Groups ---

    createGroup: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const group = await ctx.prisma.group.create({
                data: {
                    name: input.name,
                    creatorId: ctx.session.user.id,
                    members: {
                        create: {
                            userId: ctx.session.user.id,
                            role: "ADMIN"
                        }
                    }
                }
            });
            return group;
        }),

    getGroups: protectedProcedure
        .query(async ({ ctx }) => {
            const memberships = await ctx.prisma.groupMember.findMany({
                where: { userId: ctx.session.user.id },
                include: {
                    group: {
                        include: {
                            _count: { select: { members: true } },
                            members: {
                                take: 3,
                                include: { user: { select: { image: true, name: true, id: true } } }
                            }
                        }
                    }
                }
            });

            // Resolve images
            const groups = await Promise.all(memberships.map(async (m) => {
                const group = m.group;
                const membersWithImages = await Promise.all(group.members.map(async (gm) => {
                    if (gm.user.image && !gm.user.image.startsWith("http")) {
                        gm.user.image = await getPresignedDownloadUrl(gm.user.image);
                    }
                    return gm;
                }));
                return { ...group, members: membersWithImages };
            }));

            return groups;
        }),

    getGroupDetails: protectedProcedure
        .input(z.object({ groupId: z.string() }))
        .query(async ({ ctx, input }) => {
            const group = await ctx.prisma.group.findUnique({
                where: { id: input.groupId },
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, name: true, image: true } }
                        }
                    }
                }
            });
            return group;
        }),

    addGroupMember: protectedProcedure
        .input(z.object({ groupId: z.string(), userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if user is admin of group
            const membership = await ctx.prisma.groupMember.findUnique({
                where: {
                    userId_groupId: {
                        userId: ctx.session.user.id,
                        groupId: input.groupId
                    }
                }
            });

            if (!membership || membership.role !== "ADMIN") {
                // Allow creator? Creator is admin via creation logic.
                // Or maybe allow any member to add?
                // Let's strict to ADMIN for now.
                throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add members" });
            }

            return ctx.prisma.groupMember.create({
                data: {
                    groupId: input.groupId,
                    userId: input.userId,
                    role: "MEMBER"
                }
            });
        }),

    updateGroup: protectedProcedure
        .input(z.object({
            groupId: z.string(),
            name: z.string().min(1).optional(),
            image: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const membership = await ctx.prisma.groupMember.findUnique({
                where: { userId_groupId: { userId: ctx.session.user.id, groupId: input.groupId } }
            });

            if (!membership || membership.role !== "ADMIN") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update group settings" });
            }

            return ctx.prisma.group.update({
                where: { id: input.groupId },
                data: {
                    name: input.name,
                    image: input.image
                }
            });
        }),

    deleteGroup: protectedProcedure
        .input(z.object({ groupId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const membership = await ctx.prisma.groupMember.findUnique({
                where: { userId_groupId: { userId: ctx.session.user.id, groupId: input.groupId } }
            });

            if (!membership || membership.role !== "ADMIN") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete groups" });
            }

            return ctx.prisma.group.delete({
                where: { id: input.groupId }
            });
        }),

    getGroupFiles: protectedProcedure
        .input(z.object({ groupId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Verify membership
            const membership = await ctx.prisma.groupMember.findUnique({
                where: { userId_groupId: { userId: ctx.session.user.id, groupId: input.groupId } }
            });
            if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });

            return ctx.prisma.note.findMany({
                where: {
                    sharedGroups: {
                        some: { id: input.groupId }
                    }
                },
                include: {
                    author: { select: { name: true, image: true, id: true } },
                    course: true
                },
                orderBy: { createdAt: "desc" }
            });
        })

});
