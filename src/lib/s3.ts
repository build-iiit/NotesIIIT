
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

    // Use the proxy route for all S3 downloads to avoid connectivity issues
    // with local MinIO when accessing via tunnels or different networks.
    // This includes 'uploads/' which are now stored in MinIO.
    return `/api/files/${cleanKey}`;
};


export const uploadFileToS3 = async (buffer: Buffer, key: string, contentType: string) => {
    // Remove leading slash if present
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
    });

    try {
        await s3Client.send(command);
        console.log(`Successfully uploaded to S3: ${cleanKey}`);
        return cleanKey;
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw error;
    }
};

export { s3Client };
