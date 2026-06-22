import { z } from"zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from"@/server/api/trpc";
import { TRPCError } from"@trpc/server";
import { getPresignedDownloadUrl } from"@/lib/storage";

export const votesRouter = createTRPCRouter({
 /**
 * Retrieves the up/down vote statistics for a specific page of a note version.
 * Includes the current user's vote if authenticated.
 */
 getStats: publicProcedure
 .input(z.object({ versionId: z.string(), pageNumber: z.number() }))
 .query(async ({ ctx, input }) => {
 const page = await ctx.prisma.page.findUnique({
 where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
 include: { votes: true },
 });

 if (!page) return { up: 0, down: 0, userVote: null };

 return {
 up: page.votes.filter(v => v.type ==="UP").length,
 down: page.votes.filter(v => v.type ==="DOWN").length,
 userVote: ctx.session?.user?.id ? page.votes.find(v => v.userId === ctx.session!.user.id)?.type : null
 };
 }),

 /**
 * Casts or updates a vote (UP/DOWN) for a given page.
 * Automatically handles score aggregation on the parent Note and notification dispatching.
 */
 vote: protectedProcedure
 .input(
 z.object({
 versionId: z.string(),
 pageNumber: z.number(),
 type: z.enum(["UP","DOWN"]),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const page = await ctx.prisma.page.upsert({
 where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
 create: { versionId: input.versionId, number: input.pageNumber },
 update: {},
 include: { version: { include: { note: true } } }
 });

 const existingVote = await ctx.prisma.vote.findUnique({
 where: { userId_pageId: { userId: ctx.session.user.id, pageId: page.id } },
 });

 let scoreDelta = 0;
 let isNewUpvote = false;

 if (existingVote) {
 if (existingVote.type === input.type) {
 scoreDelta = existingVote.type ==="UP" ? -1 : 1;
 await ctx.prisma.vote.delete({ where: { id: existingVote.id } });
 } else {
 scoreDelta = input.type ==="UP" ? 2 : -2;
 await ctx.prisma.vote.update({
 where: { id: existingVote.id },
 data: { type: input.type },
 });
 if (input.type ==="UP") isNewUpvote = true;
 }
 } else {
 scoreDelta = input.type ==="UP" ? 1 : -1;
 await ctx.prisma.vote.create({
 data: {
 userId: ctx.session.user.id,
 pageId: page.id,
 type: input.type,
 },
 });
 if (input.type ==="UP") isNewUpvote = true;
 }

 const noteVersion = await ctx.prisma.noteVersion.findUnique({
 where: { id: input.versionId },
 include: { note: { select: { id: true, authorId: true, title: true } } }
 });

 if (noteVersion && scoreDelta !== 0) {
 await ctx.prisma.note.update({
 where: { id: noteVersion.noteId },
 data: {
 voteScore: { increment: scoreDelta }
 }
 });
 }

 if (isNewUpvote && noteVersion?.note && noteVersion.note.authorId !== ctx.session.user.id) {
 const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
 const existingNotification = await ctx.prisma.notification.findFirst({
 where: {
 userId: noteVersion.note.authorId,
 type:"VOTES_ON_NOTE",
 createdAt: { gte: oneHourAgo },
 data: {
 path: ["noteId"],
 equals: noteVersion.note.id
 }
 }
 });

 if (existingNotification) {
 const currentData = existingNotification.data as { noteId: string; noteTitle: string; voteCount: number } | null;
 const currentCount = currentData?.voteCount ?? 1;

 await ctx.prisma.notification.update({
 where: { id: existingNotification.id },
 data: {
 isRead: false,
 createdAt: new Date(),
 data: {
 noteId: noteVersion.note.id,
 noteTitle: noteVersion.note.title,
 voteCount: currentCount + 1
 }
 }
 });
 } else {
 await ctx.prisma.notification.create({
 data: {
 userId: noteVersion.note.authorId,
 actorId: ctx.session.user.id,
 type:"VOTES_ON_NOTE",
 data: {
 noteId: noteVersion.note.id,
 noteTitle: noteVersion.note.title,
 voteCount: 1
 }
 }
 });
 }
 }

 return { success: true };
 }),
});

export const commentsRouter = createTRPCRouter({
 /**
 * Fetches all top-level comments and their nested replies for a specific page.
 * Includes resolved user avatars via presigned S3 URLs.
 */
 getByPage: publicProcedure
 .input(z.object({ versionId: z.string(), pageNumber: z.number() }))
 .query(async ({ ctx, input }) => {
 const page = await ctx.prisma.page.findUnique({
 where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
 include: {
 comments: {
 where: { parentId: null },
 include: {
 user: true,
 children: { include: { user: true } }
 },
 orderBy: { createdAt:"desc" },
 },
 },
 });

 if (!page?.comments) return [];

 return await Promise.all(page.comments.map(async (comment) => {
 if (comment.user.image && !comment.user.image.startsWith("http")) {
 comment.user.image = await getPresignedDownloadUrl(comment.user.image);
 }

 if (comment.children) {
 comment.children = await Promise.all(comment.children.map(async (child) => {
 if (child.user.image && !child.user.image.startsWith("http")) {
 child.user.image = await getPresignedDownloadUrl(child.user.image);
 }
 return child;
 }));
 }

 return comment;
 }));
 }),

 /**
 * Creates a new comment or reply on a specific note version page.
 * Dispatches notifications to the note author or parent comment author.
 */
 create: protectedProcedure
 .input(
 z.object({
 versionId: z.string(),
 pageNumber: z.number(),
 content: z.string().min(1),
 parentId: z.string().optional(),
 isPrivate: z.boolean().default(false),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const page = await ctx.prisma.page.upsert({
 where: { versionId_number: { versionId: input.versionId, number: input.pageNumber } },
 create: { versionId: input.versionId, number: input.pageNumber },
 update: {},
 });

 const comment = await ctx.prisma.comment.create({
 data: {
 content: input.content,
 userId: ctx.session.user.id,
 pageId: page.id,
 parentId: input.parentId,
 isPrivate: input.isPrivate,
 },
 });

 const noteVersion = await ctx.prisma.noteVersion.findUnique({
 where: { id: input.versionId },
 include: { note: { select: { authorId: true, id: true, title: true } } }
 });

 if (noteVersion?.note) {
 const noteAuthorId = noteVersion.note.authorId;

 if (input.parentId) {
 const parentComment = await ctx.prisma.comment.findUnique({
 where: { id: input.parentId },
 select: { userId: true }
 });

 if (parentComment && parentComment.userId !== ctx.session.user.id) {
 await ctx.prisma.notification.create({
 data: {
 userId: parentComment.userId,
 actorId: ctx.session.user.id,
 type:"REPLY_TO_COMMENT",
 data: {
 noteId: noteVersion.note.id,
 noteTitle: noteVersion.note.title,
 commentId: comment.id,
 versionId: input.versionId,
 pageNumber: input.pageNumber
 }
 }
 });
 }
 }

 if (noteAuthorId !== ctx.session.user.id) {
 await ctx.prisma.notification.create({
 data: {
 userId: noteAuthorId,
 actorId: ctx.session.user.id,
 type:"COMMENT_ON_NOTE",
 data: {
 noteId: noteVersion.note.id,
 noteTitle: noteVersion.note.title,
 commentId: comment.id,
 versionId: input.versionId,
 pageNumber: input.pageNumber
 }
 }
 });
 }
 }

 return comment;
 }),
});

export const bookmarksRouter = createTRPCRouter({
 /**
 * Toggles a bookmark for a specific page of a note.
 * Creates a new bookmark if none exists, or removes the existing one.
 */
 toggle: protectedProcedure
 .input(
 z.object({
 noteId: z.string(),
 pageNumber: z.number().int().positive(),
 label: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const existingBookmark = await ctx.prisma.bookmark.findUnique({
 where: {
 userId_noteId_pageNumber: {
 userId: ctx.session.user.id,
 noteId: input.noteId,
 pageNumber: input.pageNumber,
 },
 },
 });

 if (existingBookmark) {
 await ctx.prisma.bookmark.delete({
 where: { id: existingBookmark.id },
 });
 return { action:"removed", bookmark: null };
 } else {
 const bookmark = await ctx.prisma.bookmark.create({
 data: {
 userId: ctx.session.user.id,
 noteId: input.noteId,
 pageNumber: input.pageNumber,
 label: input.label,
 },
 });
 return { action:"created", bookmark };
 }
 }),

 getForNote: protectedProcedure
 .input(z.object({ noteId: z.string() }))
 .query(async ({ ctx, input }) => {
 return ctx.prisma.bookmark.findMany({
 where: {
 userId: ctx.session.user.id,
 noteId: input.noteId,
 },
 orderBy: { pageNumber:"asc" },
 });
 }),

 getAll: protectedProcedure.query(async ({ ctx }) => {
 return ctx.prisma.bookmark.findMany({
 where: {
 userId: ctx.session.user.id,
 },
 include: {
 note: {
 select: {
 id: true,
 title: true,
 },
 },
 },
 orderBy: { createdAt:"desc" },
 });
 }),

 delete: protectedProcedure
 .input(z.object({ bookmarkId: z.string() }))
 .mutation(async ({ ctx, input }) => {
 const bookmark = await ctx.prisma.bookmark.findUnique({
 where: { id: input.bookmarkId },
 });

 if (!bookmark || bookmark.userId !== ctx.session.user.id) {
 throw new TRPCError({ code:"NOT_FOUND", message:"Bookmark not found or unauthorized" });
 }

 return ctx.prisma.bookmark.delete({
 where: { id: input.bookmarkId },
 });
 }),
});

export const interactionsRouter = createTRPCRouter({
 votes: votesRouter,
 comments: commentsRouter,
 bookmarks: bookmarksRouter,
});
