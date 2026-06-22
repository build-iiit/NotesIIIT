import { z } from"zod";
import { createTRPCRouter, protectedProcedure } from"@/server/api/trpc";
import { TRPCError } from"@trpc/server";

export const versionsRouter = createTRPCRouter({
 /**
 * Add a new version to an existing note.
 * Auth: Author or Admin
 */
 addVersion: protectedProcedure
 .input(
 z.object({
 noteId: z.string(),
 s3Key: z.string(),
 thumbnailKey: z.string().nullish(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const note = await ctx.prisma.note.findUnique({ where: { id: input.noteId } });
 if (!note) throw new TRPCError({ code:"NOT_FOUND", message:"Note not found" });

 if (note.authorId !== ctx.session.user.id && ctx.session.user.role !=="ADMIN") {
 throw new TRPCError({ code:"UNAUTHORIZED", message:"Not authorized" });
 }

 // Determine next version number
 const lastVersion = await ctx.prisma.noteVersion.findFirst({
 where: { noteId: input.noteId },
 orderBy: { version:"desc" },
 });
 const nextVer = (lastVersion?.version || 0) + 1;

 return ctx.prisma.$transaction(async (tx) => {
 const version = await tx.noteVersion.create({
 data: {
 noteId: input.noteId,
 version: nextVer,
 s3Key: input.s3Key,
 thumbnailKey: input.thumbnailKey,
 },
 });

 await tx.note.update({
 where: { id: input.noteId },
 data: { currentVersionId: version.id },
 });

 return version;
 });
 }),
});
