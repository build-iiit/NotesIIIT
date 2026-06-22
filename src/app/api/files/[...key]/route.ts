import { NextRequest, NextResponse } from "next/server";
import { downloadBlob } from "@/lib/storage";

// Force dynamic to allow streaming and reading headers
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const key = resolvedParams.key.join("/");

    if (!key) {
      return new NextResponse("File key is missing", { status: 400 });
    }

    try {
      const response = await downloadBlob(key);

      const contentType = response.contentType || "application/pdf";
      const contentLength = response.contentLength;

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      if (contentLength) {
        headers.set("Content-Length", contentLength.toString());
      }

      // Convert NodeJS ReadableStream to Web ReadableStream if necessary
      // Azure blob SDK returns NodeJS.ReadableStream for `readableStreamBody`
      // We can use the stream directly by casting or wrapping
      const stream = response.body as any as ReadableStream;
      
      return new NextResponse(stream, {
        headers,
      });

    } catch (storageError: any) {
      console.error("Storage Fetch Error:", storageError);
      if (storageError.statusCode === 404) {
        return new NextResponse("File not found", { status: 404 });
      }
      throw storageError;
    }
  } catch (error) {
    console.error("Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
