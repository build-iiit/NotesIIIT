import { createTRPCRouter } from "@/server/api/trpc";
import { notesRouter } from "@/server/api/routers/notes";
import { authRouter } from "@/server/api/routers/auth";
import { versionsRouter } from "@/server/api/routers/versions";
import { votesRouter } from "@/server/api/routers/votes";
import { commentsRouter } from "@/server/api/routers/comments";
import { leaderboardsRouter } from "@/server/api/routers/leaderboards";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    notes: notesRouter,
    auth: authRouter,
    versions: versionsRouter,
    votes: votesRouter,
    comments: commentsRouter,
    leaderboards: leaderboardsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
