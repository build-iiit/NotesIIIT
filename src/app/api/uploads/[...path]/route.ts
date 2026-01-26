import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { promisify } from "util";

// Define mime types manually to avoid external dependency issues if not installed
const MIME_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".json": "application/json",
};

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        const filePath = path.join(process.cwd(), "public", "uploads", ...pathSegments);

        // Security check: Ensure we are still within the public directory
        const publicDir = path.join(process.cwd(), "public");
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(publicDir)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        const fileBuffer = await fs.promises.readFile(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
