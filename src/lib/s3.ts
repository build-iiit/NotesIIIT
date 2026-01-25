
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    forcePathStyle: true, // Required for Minio
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
});

export const getPresignedUrl = async (key: string, contentType: string) => {
    // Remove leading slash if present to avoid double slash in S3 paths
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
        Key: cleanKey,
        ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const getPresignedDownloadUrl = async (key: string) => {
    // Remove leading slash if present to avoid double slash in S3 paths
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;

    // Check if this is a local file (stored in public/uploads/)
    // If so, return the local URL instead of generating a MinIO presigned URL
    if (cleanKey.startsWith('uploads/')) {
        return `/${cleanKey}`;
    }

    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
        Key: cleanKey,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export { s3Client };
