import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// S3 Client
const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
    },
    forcePathStyle: true,
});

export async function POST(req: NextRequest) {
    try {
        // Verify auth
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { fileId, fileName, accessToken } = body;

        if (!fileId || !fileName || !accessToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log(`[Drive Upload] Starting download: ${fileName} (${fileId})`);

        // Download from Google Drive
        const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!driveResponse.ok) {
            const errorText = await driveResponse.text();
            console.error("[Drive Upload] Download failed:", errorText);
            return NextResponse.json(
                { error: "Failed to download from Google Drive" },
                { status: 500 }
            );
        }

        // Get file as buffer
        const arrayBuffer = await driveResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`[Drive Upload] Downloaded ${buffer.length} bytes, uploading to S3...`);

        // Generate S3 key
        const fileExt = fileName.split(".").pop() || "pdf";
        const s3Key = `uploads/${session.user.id}/${uuidv4()}.${fileExt}`;

        // Upload to S3
        await s3Client.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
                Key: s3Key,
                Body: buffer,
                ContentType: "application/pdf",
            })
        );

        console.log(`[Drive Upload] Uploaded to S3: ${s3Key}`);

        return NextResponse.json({
            success: true,
            s3Key,
            fileName,
            size: buffer.length,
        });
    } catch (error) {
        console.error("[Drive Upload] Error:", error);
        return NextResponse.json(
            { error: "Server error during upload" },
            { status: 500 }
        );
    }
}
