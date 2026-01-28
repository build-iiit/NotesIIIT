import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

interface CreateContextOptions {
    headers: Headers;
}

export const createInnerTRPCContext = async (opts: CreateContextOptions) => {
    const session = await auth();

    return {
        session,
        headers: opts.headers,
        prisma,
    };
};

export const createTRPCContext = async (opts: { headers: Headers }) => {
    // Fetch stuff that depends on the request

    return await createInnerTRPCContext({
        headers: opts.headers,
    });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Server-Side Caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but the generic existing context is used.
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid, checks user status, and guarantees `ctx.session.user` is not null.
 * 
 * IMPORTANT: This now fetches fresh user data from the database to enforce bans/suspensions
 * immediately, without requiring the user to re-login.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Fetch current user status from database to enforce bans/suspensions immediately
    const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
            id: true,
            status: true,
            role: true,
            suspendedUntil: true,
        },
    });

    if (!currentUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    // Check if user is banned
    if (currentUser.status === "BANNED") {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been banned. Contact support for assistance.",
        });
    }

    // Check if user is suspended (and suspension hasn't expired)
    if (currentUser.status === "SUSPENDED") {
        const now = new Date();
        if (!currentUser.suspendedUntil || currentUser.suspendedUntil > now) {
            const expiresMsg = currentUser.suspendedUntil
                ? ` until ${currentUser.suspendedUntil.toLocaleDateString()}`
                : "";
            throw new TRPCError({
                code: "FORBIDDEN",
                message: `Your account is suspended${expiresMsg}. Contact support for assistance.`,
            });
        }
        // Suspension has expired - automatically reinstate (async, don't await)
        ctx.prisma.user.update({
            where: { id: currentUser.id },
            data: { status: "ACTIVE", suspendedUntil: null },
        }).catch(() => { }); // Fire and forget
    }

    // Check maintenance mode - admins can bypass
    const adminRoles = ["SUPER_ADMIN", "ADMIN"];
    if (!adminRoles.includes(currentUser.role)) {
        // Check if maintenance mode is enabled from database settings
        const maintenanceSetting = await ctx.prisma.platformSetting.findUnique({
            where: { key: "maintenance.enabled" },
        });
        if (maintenanceSetting?.value === true) {
            // Fetch custom message if available
            const messageSetting = await ctx.prisma.platformSetting.findUnique({
                where: { key: "maintenance.message" },
            });
            const message = typeof messageSetting?.value === "string"
                ? messageSetting.value
                : "The platform is currently under maintenance. Please check back soon.";
            throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message,
            });
        }
    }

    return next({
        ctx: {
            // Use fresh role from database instead of cached session
            session: {
                ...ctx.session,
                user: {
                    ...ctx.session.user,
                    role: currentUser.role,
                    status: currentUser.status,
                },
            },
        },
    });
});

/**
 * Admin procedure - requires SUPER_ADMIN, ADMIN, or MODERATOR role
 * This is the base admin panel access procedure
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
    const adminRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
    if (!adminRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return next({
        ctx: {
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});

/**
 * Moderator procedure - requires at least MODERATOR role
 * For content moderation actions (hide, lock notes, moderate comments)
 */
export const moderatorProcedure = protectedProcedure.use(({ ctx, next }) => {
    const moderatorRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
    if (!moderatorRoles.includes(ctx.session.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Moderator access required" });
    }
    return next({
        ctx: {
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});

/**
 * Super Admin procedure - requires SUPER_ADMIN role only
 * For sensitive operations like audit logs, user deletion, role promotion
 */
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
    if ((ctx.session.user.role as string) !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
    }
    return next({
        ctx: {
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});

/**
 * Create a procedure that requires specific roles
 * @param allowedRoles - Array of roles that can access this procedure
 */
export const createRoleProcedure = (allowedRoles: string[]) => {
    return protectedProcedure.use(({ ctx, next }) => {
        if (!allowedRoles.includes(ctx.session.user.role)) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: `Access denied. Required roles: ${allowedRoles.join(", ")}`
            });
        }
        return next({
            ctx: {
                session: { ...ctx.session, user: ctx.session.user },
            },
        });
    });
};

/**
 * Access Control Helpers
 */
export const ensureAuthorOrAdmin = (userId: string, authorId: string, role: string) => {
    const adminRoles = ["SUPER_ADMIN", "ADMIN"];
    if (adminRoles.includes(role)) return true;
    return userId === authorId;
};

/**
 * Check if user has admin-level access (any admin role)
 */
export const isAdminRole = (role: string): boolean => {
    return ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role);
};

/**
 * Check if user role can perform action on target role
 * Used to prevent privilege escalation
 */
export const canActOnRole = (actorRole: string, targetRole: string): boolean => {
    const hierarchy: Record<string, number> = {
        SUPER_ADMIN: 4,
        ADMIN: 3,
        MODERATOR: 2,
        USER: 1,
    };
    return (hierarchy[actorRole] || 0) > (hierarchy[targetRole] || 0);
};
