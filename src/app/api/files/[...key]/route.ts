
import { NextRequest, NextResponse } from"next/server";
import { downloadBlob } from"@/lib/storage";
import { Readable } from"stream";

// Force dynamic to allow streaming and reading headers
export const dynamic ='force-dynamic';

/**
 * Convert a Node.js Readable stream to a web ReadableStream.
 */
function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
 const readable = nodeStream as Readable;
 return new ReadableStream<Uint8Array>({
 start(controller) {
 readable.on("data", (chunk: Buffer) => {
 controller.enqueue(new Uint8Array(chunk));
 });
 readable.on("end", () => {
 controller.close();
 });
 readable.on("error", (err) => {
 controller.error(err);
 });
 },
 cancel() {
 readable.destroy();
 },
 });
}

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ key: string[] }> }
) {
 try {
 const resolvedParams = await params;
 // Reconstruct the key from the catch-all route (e.g., ["notes","userId","file.pdf"] ->"notes/userId/file.pdf")
 const key = resolvedParams.key.join("/");

 if (!key) {
 return new NextResponse("File key is missing", { status: 400 });
 }

 // Forward Range header for progressive PDF loading (pdfjs-dist uses this)
 const rangeHeader = request.headers.get("range") || undefined;

 try {
 const result = await downloadBlob(key, rangeHeader);

 // Create headers
 const headers = new Headers();
 headers.set("Content-Type", result.contentType);
 headers.set("Cache-Control","public, max-age=31536000, immutable");
 headers.set("Accept-Ranges","bytes");

 if (result.contentLength) {
 headers.set("Content-Length", result.contentLength.toString());
 }

 if (!result.body) {
 return new NextResponse("Empty response from storage", { status: 500 });
 }

 // If this was a Range request and we got partial content
 if (result.isPartial && result.contentRange) {
 headers.set("Content-Range", result.contentRange);

 return new NextResponse(nodeStreamToWeb(result.body), {
 status: 206,
 headers,
 });
 }

 // Stream the file directly from Azure Blob to the client
 return new NextResponse(nodeStreamToWeb(result.body), {
 headers,
 });

 } catch (blobError: any) {
 console.error("Azure Blob Fetch Error:", blobError);
 if (blobError.statusCode === 404 || blobError.code === "BlobNotFound") {
 return new NextResponse("File not found", { status: 404 });
 }
 throw blobError;
 }

 } catch (error) {
 console.error("Proxy Error:", error);
 return new NextResponse("Internal Server Error", { status: 500 });
 }
}
