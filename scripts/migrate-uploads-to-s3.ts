/**
 * Migration script to upload local files from public/uploads to MinIO S3
 * Run with: npx ts-node scripts/migrate-uploads-to-s3.ts
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "notes-bucket";
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

async function checkFileExists(key: string): Promise<boolean> {
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));
        return true;
    } catch {
        return false;
    }
}

async function uploadFile(filePath: string, key: string, contentType: string): Promise<void> {
    const fileBuffer = fs.readFileSync(filePath);

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
    }));
}

function getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    };
    return types[ext] || "application/octet-stream";
}

async function migrate() {
    console.log("🚀 Starting migration of local uploads to S3...");
    console.log(`📁 Source: ${UPLOADS_DIR}`);
    console.log(`☁️  Destination: s3://${BUCKET_NAME}/`);
    console.log("");

    if (!fs.existsSync(UPLOADS_DIR)) {
        console.error("❌ Uploads directory does not exist!");
        return;
    }

    const files = fs.readdirSync(UPLOADS_DIR);
    const pdfFiles = files.filter(f => f.endsWith(".pdf") || f.endsWith(".PDF"));
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`📊 Found ${pdfFiles.length} PDFs and ${imageFiles.length} images to migrate\n`);

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    // Migrate PDFs
    for (const file of pdfFiles) {
        const filePath = path.join(UPLOADS_DIR, file);
        const s3Key = `uploads/${file}`;

        try {
            const exists = await checkFileExists(s3Key);
            if (exists) {
                console.log(`⏭️  Skipping (already exists): ${file}`);
                skipped++;
                continue;
            }

            console.log(`📤 Uploading PDF: ${file}`);
            await uploadFile(filePath, s3Key, "application/pdf");
            console.log(`✅ Uploaded: ${s3Key}`);
            uploaded++;
        } catch (error) {
            console.error(`❌ Failed to upload ${file}:`, error);
            errors++;
        }
    }

    // Migrate thumbnails/images
    for (const file of imageFiles) {
        const filePath = path.join(UPLOADS_DIR, file);
        const s3Key = `thumbnails/${file}`;
        const contentType = getContentType(file);

        try {
            const exists = await checkFileExists(s3Key);
            if (exists) {
                console.log(`⏭️  Skipping (already exists): ${file}`);
                skipped++;
                continue;
            }

            console.log(`📤 Uploading image: ${file}`);
            await uploadFile(filePath, s3Key, contentType);
            console.log(`✅ Uploaded: ${s3Key}`);
            uploaded++;
        } catch (error) {
            console.error(`❌ Failed to upload ${file}:`, error);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Complete!");
    console.log(`   ✅ Uploaded: ${uploaded}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log("=".repeat(50));
}

migrate().catch(console.error);
