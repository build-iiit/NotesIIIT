import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export const aiRouter = createTRPCRouter({
    askDocument: protectedProcedure
        .input(z.object({
            versionId: z.string(),
            question: z.string().min(1),
            pageNumber: z.number().optional(),
            searchFullDocument: z.boolean().optional().default(false)
        }))
        .mutation(async ({ ctx, input }) => {
            if (!process.env.GOOGLE_GEMINI_API_KEY) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Gemini API key not configured"
                });
            }

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
                // 2. Download the PDF
                let url = await getPresignedDownloadUrl(version.s3Key);

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

                // 3. Extract text from PDF using pdfjs-dist
                const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdfDoc = await loadingTask.promise;

                const totalPages = pdfDoc.numPages;
                const currentPage = input.pageNumber || 1;

                // Determine page range based on search mode
                let startPage: number;
                let endPage: number;

                if (input.searchFullDocument) {
                    // Search full document
                    startPage = 1;
                    endPage = totalPages;
                } else {
                    // Focused search: current page ± 2 pages (5 pages total)
                    startPage = Math.max(1, currentPage - 2);
                    endPage = Math.min(totalPages, currentPage + 2);
                }

                let extractedText = "";
                for (let i = startPage; i <= endPage; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .map((item: any) => item.str || "")
                        .join(" ");
                    extractedText += `Page ${i}:\n${pageText}\n\n`;
                }

                const pagesSearched = endPage - startPage + 1;
                console.log(`Extracted text from pages ${startPage}-${endPage} (${pagesSearched} pages), length: ${extractedText?.length || 0} chars`);

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
