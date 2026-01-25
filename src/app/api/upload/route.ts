import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const file: File | null = data.get("file") as unknown as File;
        const thumbnailFile: File | null = data.get("thumbnail") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if not exists in public folder
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            console.error("Error creating directory", e);
        }

        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${timestamp}-${sanitizedFilename}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);
        console.log(`Saved file to ${filepath}`);

        let thumbnailKey = null;

        // Save thumbnail if provided by client
        if (thumbnailFile) {
            try {
                const thumbBytes = await thumbnailFile.arrayBuffer();
                const thumbBuffer = Buffer.from(thumbBytes);
                const thumbFilename = `${timestamp}-${sanitizedFilename}-thumb.jpg`;
                const thumbPath = path.join(uploadDir, thumbFilename);

                await writeFile(thumbPath, thumbBuffer);
                thumbnailKey = `/uploads/${thumbFilename}`;
                console.log(`Saved thumbnail to ${thumbPath}`);
            } catch (thumbError) {
                console.error("Error saving uploaded thumbnail:", thumbError);
            }
        }

        // Return the public URL path
        return NextResponse.json({
            success: true,
            key: `/uploads/${filename}`,
            thumbnailKey
        });
    } catch (error) {
        console.error("Upload handler error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
