import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const aiRouter = createTRPCRouter({
    /**
     * Get available Gemini models using the user's API key.
     */
    getAvailableModels: protectedProcedure
        .query(async ({ ctx }) => {
            // Get user's personal API key from database
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.session.user.id },
                select: { geminiApiKey: true }
            });

            if (!user?.geminiApiKey) {
                // Return default list if no key set
                return [
                    { id: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash (Fast)" },
                    { id: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro (Brain)" },
                    { id: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash" }
                ];
            }

            try {
                // Initialize Gemini with user's personal API key
                // Note: We're using the raw API to list models as SDK support might vary
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${user.geminiApiKey}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("[AI Router] Gemini API Error:", { status: response.status, statusText: response.statusText, body: errorText });
                    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();

                // Filter for generateContent supported models
                const models = (data.models || [])
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((m: any) =>
                        m.supportedGenerationMethods?.includes("generateContent") &&
                        (m.name.includes("gemini") || m.name.includes("flash"))
                    )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((m: any) => {
                        const id = m.name.replace("models/", "");
                        return {
                            id,
                            displayName: id
                        };
                    });

                // Prioritize 2.0/2.5 models if found
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                models.sort((a: any, b: any) => {
                    if (a.id.includes("2.5")) return -1;
                    if (b.id.includes("2.5")) return 1;
                    if (a.id.includes("2.0")) return -1;
                    if (b.id.includes("2.0")) return 1;
                    return 0;
                });

                return models.length > 0 ? models : [
                    { id: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash (Default)" },
                    { id: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro" }
                ];

            } catch (error) {
                console.error("Error fetching models:", error);

                const errMessage = error instanceof Error ? error.message : String(error);

                if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED")) {
                    throw new TRPCError({
                        code: "TOO_MANY_REQUESTS",
                        message: "Gemini API rate limit reached. Please wait a moment.",
                        cause: error
                    });
                }

                if (errMessage.includes("400") || errMessage.includes("INVALID_ARGUMENT") || errMessage.includes("API_KEY_INVALID")) {
                    throw new TRPCError({
                        code: "PRECONDITION_FAILED",
                        message: "Invalid API Key. Please check your settings.",
                        cause: error
                    });
                }

                // If the key is invalid or request failed, do NOT return a misleading fallback list.
                // Throw an error so the UI knows something is wrong.
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Failed to fetch models: " + errMessage,
                    cause: error
                });
            }
        }),

    /**
     * Ask a question about a document using an image of the current page.
     * This approach sends the rendered page image to Gemini for vision-based understanding.
     */
    askDocumentWithImage: protectedProcedure
        .input(z.object({
            versionId: z.string(),
            question: z.string().min(1),
            pageNumber: z.number(),
            imageBase64: z.string().min(1),
            model: z.string().optional().default("gemini-2.0-flash"), // Allow any string now
        }))
        .mutation(async ({ ctx, input }) => {
            // Get user's personal API key from database
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.session.user.id },
                select: { geminiApiKey: true }
            });

            // Require user to have their own API key for privacy
            if (!user?.geminiApiKey) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "API_KEY_REQUIRED"
                });
            }

            // Initialize Gemini with user's personal API key
            console.log("DEBUG: Using API Key from DB:", user.geminiApiKey ? user.geminiApiKey.substring(0, 10) + "..." : "UNDEFINED");
            const genAI = new GoogleGenerativeAI(user.geminiApiKey);

            // Verify the version exists and user has access
            const version = await ctx.prisma.noteVersion.findUnique({
                where: { id: input.versionId },
                include: { note: true }
            });

            if (!version) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Document version not found" });
            }

            // Check access
            const note = version.note;
            const isAuthor = note.authorId === ctx.session.user.id;
            let hasAccess = isAuthor || note.visibility === "PUBLIC";

            if (!hasAccess) {
                const noteWithGroups = await ctx.prisma.note.findUnique({
                    where: { id: note.id },
                    include: { sharedGroups: { include: { members: { where: { userId: ctx.session.user.id } } } } }
                });
                if (noteWithGroups?.sharedGroups.some(g => g.members.length > 0)) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have access to this document" });
            }


            // Use selected model, default to 2.5-flash
            const modelName = input.model || "gemini-2.5-flash";

            console.log(`[AI Debug] Using model: ${modelName}`);
            console.log(`[AI Debug] Using API Key: ${user.geminiApiKey?.substring(0, 8)}... (Length: ${user.geminiApiKey?.length})`);

            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `You are an intelligent assistant helping a student understand a document.
You are looking at page ${input.pageNumber} of a PDF document.

User Question: ${input.question}

Please answer the question based on what you can see in the image. Be concise and helpful. If the answer isn't visible on this page, let the user know they may need to check other pages.`;

            try {
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: input.imageBase64
                        }
                    }
                ]);

                const responseText = result.response.text();

                return {
                    answer: responseText,
                    pageViewed: input.pageNumber
                };

            } catch (error) {
                console.error("AI Error (Primary Model):", (error as Error).message);

                // Fallback to gemini-1.5-flash-001 (stable) if we weren't already using it
                const primaryModel = input.model || "gemini-2.0-flash";
                if (!primaryModel.includes("1.5")) {
                    console.log("DEBUG: Attempting fallback to gemini-1.5-flash-001");
                    try {
                        // Try stable flash version
                        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
                        const fallbackResult = await fallbackModel.generateContent([
                            prompt,
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: input.imageBase64
                                }
                            }
                        ]);
                        const fallbackResponse = fallbackResult.response.text();
                        return {
                            answer: fallbackResponse,
                            pageViewed: input.pageNumber
                        };
                    } catch (fallbackError) {
                        console.error("AI Error (Fallback 1.5-Flash):", (fallbackError as Error).message);

                        // Try one last time with Pro if Flash failed
                        console.log("DEBUG: Attempting second fallback to gemini-1.5-pro");
                        try {
                            const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                            const proResult = await proModel.generateContent([
                                prompt,
                                {
                                    inlineData: {
                                        mimeType: "image/png",
                                        data: input.imageBase64
                                    }
                                }
                            ]);
                            return {
                                answer: proResult.response.text(),
                                pageViewed: input.pageNumber
                            };
                        } catch (proError) {
                            console.error("AI Error (Fallback 1.5-Pro):", (proError as Error).message);

                            throw new TRPCError({
                                code: "INTERNAL_SERVER_ERROR",
                                message: `AI Generation Failed. 
                                Primary (2.0-Flash): ${(error as Error).message}
                                Fallback (1.5-Flash): ${(fallbackError as Error).message}
                                Fallback (1.5-Pro): ${(proError as Error).message}`,
                            });
                        }
                    }
                }

                // Check for rate limit error (429)
                const err = error as { status?: number; message?: string };
                if (err.status === 429 || (err.message && err.message.includes('429'))) {
                    throw new TRPCError({
                        code: "TOO_MANY_REQUESTS",
                        message: "RATE_LIMIT_EXCEEDED: Gemini API rate limit reached. Please wait about 30 seconds and try again, or consider upgrading to a paid plan for higher limits.",
                    });
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to process document with AI. Please try again.",
                    cause: error
                });
            }
        })
});
