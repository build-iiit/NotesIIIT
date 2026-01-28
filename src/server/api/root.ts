import { createTRPCRouter } from "@/server/api/trpc";
import { notesRouter } from "@/server/api/routers/notes";
import { courseRouter } from "@/server/api/routers/course";
import { versionsRouter } from "@/server/api/routers/versions";
import { votesRouter } from "@/server/api/routers/votes";
import { commentsRouter } from "@/server/api/routers/comments";
import { leaderboardsRouter } from "@/server/api/routers/leaderboards";
import { authRouter } from "@/server/api/routers/auth";
import { foldersRouter } from "@/server/api/routers/folders";
import { adminRouter } from "@/server/api/routers/admin";
import { bookmarksRouter } from "@/server/api/routers/bookmarks";
import { socialRouter } from "@/server/api/routers/social";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { requestsRouter } from "@/server/api/routers/requests";
import { aiRouter } from "@/server/api/routers/ai";
import { markdownNotesRouter } from "@/server/api/routers/markdownNotes";
// Admin Panel Evolution - New Routers
import { settingsRouter } from "@/server/api/routers/settings";
import { reportsRouter } from "@/server/api/routers/reports";
import { auditRouter } from "@/server/api/routers/audit";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    notes: notesRouter,
    course: courseRouter,
    versions: versionsRouter,
    votes: votesRouter,
    comments: commentsRouter,
    leaderboards: leaderboardsRouter,
    auth: authRouter,
    folders: foldersRouter,
    admin: adminRouter,
    bookmarks: bookmarksRouter,
    social: socialRouter,
    ai: aiRouter,
    markdownNotes: markdownNotesRouter,
    notifications: notificationsRouter,
    requests: requestsRouter,
    // Admin Panel Evolution - New Routes
    settings: settingsRouter,
    reports: reportsRouter,
    audit: auditRouter,
});


// export type definition of API
export type AppRouter = typeof appRouter;
