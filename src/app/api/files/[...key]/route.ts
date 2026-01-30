
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

// Force dynamic to allow streaming and reading headers
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const resolvedParams = await params;
        // Reconstruct the key from the catch-all route (e.g., ["notes", "userId", "file.pdf"] -> "notes/userId/file.pdf")
        const key = resolvedParams.key.join("/");

        if (!key) {
            return new NextResponse("File key is missing", { status: 400 });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
            Key: key,
        });

        try {
            const response = await s3Client.send(command);

            // Get content type from S3 or fallback to PDF
            const contentType = response.ContentType || "application/pdf";
            const contentLength = response.ContentLength;

            // Create headers
            const headers = new Headers();
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", "public, max-age=31536000, immutable");

            if (contentLength) {
                headers.set("Content-Length", contentLength.toString());
            }

            // Stream the file directly from S3 to the client
            // @ts-ignore - Webdoc ReadableStream vs Node Stream typings
            return new NextResponse(response.Body as ReadableStream, {
                headers,
            });

        } catch (s3Error: any) {
            console.error("S3 Fetch Error:", s3Error);
            if (s3Error.name === "NoSuchKey") {
                return new NextResponse("File not found", { status: 404 });
            }
            throw s3Error;
        }

    } catch (error) {
        console.error("Proxy Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
