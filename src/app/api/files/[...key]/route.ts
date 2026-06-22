
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
import { GetObjectCommand } from"@aws-sdk/client-s3";


// Force dynamic to allow streaming and reading headers
export const dynamic ='force-dynamic';
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

 const command = new GetObjectCommand({
 Bucket: process.env.S3_BUCKET_NAME ||"notes-bucket",
 Key: key,
 });

 try {
 const response = await s3Client.send(command);

 // Get content type from S3 or fallback to PDF
 const contentType = response.ContentType ||"application/pdf";
 const contentLength = response.ContentLength;

 // Create headers
 const headers = new Headers();
 headers.set("Content-Type", contentType);
 headers.set("Cache-Control","public, max-age=31536000, immutable");

 if (contentLength) {
 headers.set("Content-Length", contentLength.toString());
 }

 // Stream the file directly from S3 to the client
 return new NextResponse(response.Body as ReadableStream, {
 headers,
 });

 } catch (s3Error: any) {
 console.error("S3 Fetch Error:", s3Error);
 if (s3Error.name ==="NoSuchKey") {
 return new NextResponse("File not found", { status: 404 });
 }
 throw s3Error;
 }
 } catch (error) {
 console.error("Proxy Error:", error);
 return new NextResponse("Internal Server Error", { status: 500 });
 }
}
