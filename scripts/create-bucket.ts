
import { CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../src/lib/s3";

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "notes-bucket";

async function createBucket() {
    try {
        console.log(`Checking if bucket '${BUCKET_NAME}' exists...`);
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
            console.log(`Bucket '${BUCKET_NAME}' already exists.`);
        } catch (error: any) {
            if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
                console.log(`Bucket '${BUCKET_NAME}' not found. Creating...`);
                await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
                console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
            } else {
                throw error;
            }
        }

        console.log("Setting public read policy...");
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObject",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                },
            ],
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(policy),
        }));
        console.log("Bucket policy set to public read.");

        console.log("Setting CORS config...");
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "HEAD"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        }));
        console.log("CORS configuration set.");

    } catch (error) {
        console.error("Error initializing bucket:", error);
        process.exit(1);
    }
}

createBucket();
