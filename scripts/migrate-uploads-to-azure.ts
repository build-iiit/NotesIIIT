/**
 * Migration script to upload local files from public/uploads to Azure Blob Storage
 * Run with: npx ts-node scripts/migrate-uploads-to-azure.ts
 */

import { BlobServiceClient } from "@azure/storage-blob";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;" +
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
    "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;";

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "notes-bucket";
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

async function ensureContainer() {
    try {
        await containerClient.createIfNotExists({ access: "blob" });
        console.log(`✅ Container '${containerName}' is ready.`);
    } catch (error) {
        console.error("❌ Failed to create container:", error);
        throw error;
    }
}

async function checkFileExists(key: string): Promise<boolean> {
    const blobClient = containerClient.getBlockBlobClient(key);
    return blobClient.exists();
}

async function uploadFile(filePath: string, key: string, contentType: string): Promise<void> {
    const fileBuffer = fs.readFileSync(filePath);
    const blobClient = containerClient.getBlockBlobClient(key);

    await blobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: contentType },
    });
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
    console.log("🚀 Starting migration of local uploads to Azure Blob Storage...");
    console.log(`📁 Source: ${UPLOADS_DIR}`);
    console.log(`☁️  Destination: ${containerName}`);
    console.log("");

    await ensureContainer();

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
        const blobKey = `uploads/${file}`;

        try {
            const exists = await checkFileExists(blobKey);
            if (exists) {
                console.log(`⏭️  Skipping (already exists): ${file}`);
                skipped++;
                continue;
            }

            console.log(`📤 Uploading PDF: ${file}`);
            await uploadFile(filePath, blobKey, "application/pdf");
            console.log(`✅ Uploaded: ${blobKey}`);
            uploaded++;
        } catch (error) {
            console.error(`❌ Failed to upload ${file}:`, error);
            errors++;
        }
    }

    // Migrate thumbnails/images
    for (const file of imageFiles) {
        const filePath = path.join(UPLOADS_DIR, file);
        const blobKey = `thumbnails/${file}`;
        const contentType = getContentType(file);

        try {
            const exists = await checkFileExists(blobKey);
            if (exists) {
                console.log(`⏭️  Skipping (already exists): ${file}`);
                skipped++;
                continue;
            }

            console.log(`📤 Uploading image: ${file}`);
            await uploadFile(filePath, blobKey, contentType);
            console.log(`✅ Uploaded: ${blobKey}`);
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
