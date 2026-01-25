
import { ListObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../src/lib/s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "notes-bucket";

async function checkFiles() {
    try {
        console.log(`Listing files in bucket '${BUCKET_NAME}'...`);
        const data = await s3Client.send(new ListObjectsCommand({ Bucket: BUCKET_NAME }));

        if (!data.Contents || data.Contents.length === 0) {
            console.log("Bucket is empty.");
        } else {
            console.log("Files found:");
            data.Contents.forEach((file) => {
                console.log(` - ${file.Key} (${file.Size} bytes)`);
            });
        }
    } catch (error) {
        console.error("Error listing bucket contents:", error);
    }
}

checkFiles();
