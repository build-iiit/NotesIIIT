import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

export const notesRouter = createTRPCRouter({
    /**
     * List all notes with pagination and filtering.
     * Auth: Public
     */
    getAll: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().nullish(), // For infinite scroll
                courseId: z.string().optional(), // Filter by course
                search: z.string().optional(), // Search term
                semester: z.string().optional(), // Filter by semester
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 20;
            const cursor = input?.cursor;
            const courseId = input?.courseId;
            const search = input?.search;
            const semester = input?.semester;

            const items = await ctx.prisma.note.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    isPublic: true,
                    ...(courseId ? { courseId } : {}),
                    ...(semester ? { semester } : {}),
                    ...(search ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { course: { name: { contains: search, mode: 'insensitive' } } },
                            { course: { code: { contains: search, mode: 'insensitive' } } },
                            { author: { name: { contains: search, mode: 'insensitive' } } },
                        ]
                    } : {}),
                },
                orderBy: {
                    createdAt: "desc"
                },
                include: { author: true, course: true },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = items.length > 0 ? items[items.length - 1].id : undefined;
            }

            return { items, nextCursor };
        }),

    /**
     * Get a single note by ID with its current version.
     * Auth: Public
     */
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({
                where: { id: input.id },
                include: { versions: true, author: true, course: true },
            });

            if (!note) return null;

            // Security Check
            const isAuthor = ctx.session?.user?.id === note.authorId;
            if (!note.isPublic && !isAuthor) {
                return null;
            }

            // Generate Signed URL
            let fileUrl = "";
            const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];

            if (currentVersion?.s3Key) {
                fileUrl = await getPresignedDownloadUrl(currentVersion.s3Key);
            }

            return { ...note, fileUrl };
        }),

    /**
     * Generate S3 Upload URL.
     * Auth: Protected
     */
    getUploadUrl: protectedProcedure
        .input(z.object({ filename: z.string(), contentType: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const uniqueId = uuidv4();
            const extension = input.filename.split(".").pop();
            const key = `notes/${ctx.session.user.id}/${uniqueId}.${extension}`;
            const url = await getPresignedUrl(key, input.contentType);
            return { url, s3Key: key };
        }),

    /**
     * Create a new note.
     * Auth: Protected
     */
    create: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            s3Key: z.string(),
            fileSize: z.number(),
            courseId: z.string().optional(),
            semester: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { title, description, s3Key, fileSize, courseId, semester } = input;

            // Create note and initial version
            const note = await ctx.prisma.note.create({
                data: {
                    title,
                    description,
                    authorId: ctx.session.user.id,
                    courseId: courseId || null,
                    semester: semester || null,
                    versions: {
                        create: {
                            version: 1,
                            s3Key: s3Key,
                        }
                    }
                },
            });

            return note;
        }),

    /**
     * Delete a note.
     * Auth: Author or Admin
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });
            if (!note) return null;

            if (note.authorId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
                throw new Error("UNAUTHORIZED");
            }

            return ctx.prisma.note.delete({ where: { id: input.id } });
        }),

    /**
     * Update note metadata.
     * Auth: Author
     */
    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1),
            description: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const note = await ctx.prisma.note.findUnique({ where: { id: input.id } });
            if (!note) throw new Error("Note not found");

            if (note.authorId !== ctx.session.user.id) {
                throw new Error("UNAUTHORIZED");
            }

            return ctx.prisma.note.update({
                where: { id: input.id },
                data: {
                    title: input.title,
                    description: input.description,
                },
            });
        }),
});
