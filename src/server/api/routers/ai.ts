import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory cache for extracted PDF text to avoid re-downloading
// Key: versionId, Value: { pages: Map<number, string>, totalPages: number, timestamp: number }
const textCache = new Map<string, {
    pages: Map<number, string>;
    totalPages: number;
    timestamp: number;
}>();

// Cache expires after 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

// Helper to get cached text or download & parse PDF
async function getExtractedText(
    versionId: string,
    s3Key: string,
    startPage: number,
    endPage: number
): Promise<{ text: string; totalPages: number }> {
    const now = Date.now();

    // Check if we have a valid cache
    const cached = textCache.get(versionId);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        // Check if we have all the pages we need
        let allPagesAvailable = true;
        for (let i = startPage; i <= endPage && i <= cached.totalPages; i++) {
            if (!cached.pages.has(i)) {
                allPagesAvailable = false;
                break;
            }
        }

        if (allPagesAvailable) {
            console.log(`Using cached text for version ${versionId}`);
            let extractedText = "";
            for (let i = startPage; i <= Math.min(endPage, cached.totalPages); i++) {
                extractedText += `Page ${i}:\n${cached.pages.get(i)}\n\n`;
            }
            return { text: extractedText, totalPages: cached.totalPages };
        }
    }

    // Download and parse the PDF
    let url = await getPresignedDownloadUrl(s3Key);

    // Fix for local file uploads which return relative paths
    if (url.startsWith("/")) {
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        url = `${baseUrl}${url}`;
    }

    console.log("Fetching PDF from:", url);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch document from storage: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("PDF downloaded, size:", arrayBuffer.byteLength, "bytes");

    // Extract text from PDF using pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;

    const totalPages = pdfDoc.numPages;

    // Extract and cache all pages for future queries
    const pagesMap = new Map<number, string>();
    for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str || "")
            .join(" ");
        pagesMap.set(i, pageText);
    }

    // Store in cache
    textCache.set(versionId, {
        pages: pagesMap,
        totalPages,
        timestamp: now
    });

    console.log(`Cached ${totalPages} pages for version ${versionId}`);

    // Return requested pages
    let extractedText = "";
    for (let i = startPage; i <= Math.min(endPage, totalPages); i++) {
        extractedText += `Page ${i}:\n${pagesMap.get(i)}\n\n`;
    }

    return { text: extractedText, totalPages };
}

export const aiRouter = createTRPCRouter({
    askDocument: protectedProcedure
        .input(z.object({
            versionId: z.string(),
            question: z.string().min(1),
            pageNumber: z.number().optional(),
            searchFullDocument: z.boolean().optional().default(false)
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
            const genAI = new GoogleGenerativeAI(user.geminiApiKey);

            // 1. Get the S3 Key for the version
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

            if (!version.s3Key) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Document has no file associated" });
            }

            try {
                // Determine page range based on search mode (preliminary, totalPages will come from cache/extraction)
                const currentPage = input.pageNumber || 1;
                let startPage: number;
                let endPage: number;

                if (input.searchFullDocument) {
                    startPage = 1;
                    endPage = 99999; // Will be capped by actual totalPages
                } else {
                    // Focused search: current page ± 2 pages (5 pages total)
                    startPage = Math.max(1, currentPage - 2);
                    endPage = currentPage + 2; // Will be capped by actual totalPages
                }

                // Get text from cache or download PDF
                const { text: extractedText, totalPages } = await getExtractedText(
                    input.versionId,
                    version.s3Key,
                    startPage,
                    Math.min(endPage, input.searchFullDocument ? 99999 : currentPage + 2)
                );

                // Recalculate endPage now that we know totalPages
                if (input.searchFullDocument) {
                    endPage = totalPages;
                } else {
                    endPage = Math.min(totalPages, currentPage + 2);
                }

                const pagesSearched = endPage - startPage + 1;
                console.log(`Using text from pages ${startPage}-${endPage} (${pagesSearched} pages), length: ${extractedText?.length || 0} chars`);

                // 4. Send text to Gemini
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const searchContext = input.searchFullDocument
                    ? `You are searching the full document (${totalPages} pages).`
                    : `You are searching pages ${startPage}-${endPage} (around page ${currentPage}). Total document has ${totalPages} pages.`;

                const prompt = `You are an intelligent assistant helping a student understand a document.
${searchContext}

Here is the content from the searched pages:

${extractedText.substring(0, 30000)}

User Question: ${input.question}

Please answer the question based on the document content. Be concise and helpful.`;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                return {
                    answer: responseText,
                    pagesSearched: pagesSearched,
                    searchRange: `${startPage}-${endPage}`,
                    totalPages: totalPages
                };

            } catch (error) {
                console.error("AI Error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to process document with AI",
                    cause: error
                });
            }
        })
});
