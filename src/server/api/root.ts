import { createTRPCRouter } from "@/server/api/trpc";
import { notesRouter } from "@/server/api/routers/notes";
import { courseRouter } from "@/server/api/routers/course";
import { versionsRouter } from "@/server/api/routers/versions";
import { leaderboardsRouter } from "@/server/api/routers/leaderboards";
import { authRouter } from "@/server/api/routers/auth";
import { foldersRouter } from "@/server/api/routers/folders";
import { adminRouter } from "@/server/api/routers/admin";
import { socialRouter } from "@/server/api/routers/social";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { requestsRouter } from "@/server/api/routers/requests";
import { aiRouter } from "@/server/api/routers/ai";
import { markdownNotesRouter } from "@/server/api/routers/markdownNotes";
import { settingsRouter } from "@/server/api/routers/settings";
import { reportsRouter } from "@/server/api/routers/reports";
import { auditRouter } from "@/server/api/routers/audit";
import { interactionsRouter } from "@/server/api/routers/interactions";

export const appRouter = createTRPCRouter({
  notes: notesRouter,
  course: courseRouter,
  versions: versionsRouter,
  leaderboards: leaderboardsRouter,
  auth: authRouter,
  folders: foldersRouter,
  admin: adminRouter,
  social: socialRouter,
  ai: aiRouter,
  markdownNotes: markdownNotesRouter,
  notifications: notificationsRouter,
  requests: requestsRouter,
  settings: settingsRouter,
  reports: reportsRouter,
  audit: auditRouter,
  interactions: interactionsRouter,
});

export type AppRouter = typeof appRouter;
