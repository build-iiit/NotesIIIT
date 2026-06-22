import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

// ---------------------------------------------------------------------------
// Azure Blob Storage client setup
// ---------------------------------------------------------------------------

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "notes-bucket";

// Parse account name & key from connection string for SAS generation
function parseConnectionString(connStr: string) {
  const parts = connStr.split(";").reduce(
    (acc, part) => {
      const [key, ...rest] = part.split("=");
      if (key) acc[key] = rest.join("=");
      return acc;
    },
    {} as Record<string, string>
  );
  return {
    accountName: parts["AccountName"] || "",
    accountKey: parts["AccountKey"] || "",
  };
}

const { accountName, accountKey } = parseConnectionString(connectionString);

let blobServiceClient: BlobServiceClient;

if (connectionString) {
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
} else {
  // Fallback for local dev with Azurite (default connection string)
  const azuriteConnStr =
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;" +
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
    "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;";
  blobServiceClient = BlobServiceClient.fromConnectionString(azuriteConnStr);
}

const containerClient: ContainerClient =
  blobServiceClient.getContainerClient(containerName);

// ---------------------------------------------------------------------------
// Exported helpers (keep the same function signatures as the old S3 module)
// ---------------------------------------------------------------------------

/**
 * Generate a SAS URL for direct client-side upload.
 * Replaces the old `getPresignedUrl` that created S3 pre-signed PUT URLs.
 */
export const getPresignedUrl = async (
  key: string,
  contentType: string
): Promise<string> => {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const blobClient = containerClient.getBlockBlobClient(cleanKey);

  if (accountName && accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + 3600 * 1000); // 1 hour

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: cleanKey,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        startsOn,
        expiresOn,
        contentType,
      },
      credential
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  // Azurite / local dev: just return the blob URL (Azurite allows unauthenticated if container is public)
  return blobClient.url;
};

/**
 * Generate a download URL for a blob.
 * Uses the API proxy route (same as before) to avoid CORS / credential issues on the client.
 */
export const getPresignedDownloadUrl = async (key: string): Promise<string> => {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;

  // Use the proxy route for all blob downloads to avoid connectivity issues
  // and keep credentials server-side.
  return `/api/files/${cleanKey}`;
};

/**
 * Upload a buffer directly to Azure Blob Storage (server-side).
 */
export const uploadFileToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const blobClient = containerClient.getBlockBlobClient(cleanKey);

  try {
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    console.log(`Successfully uploaded to Azure Blob: ${cleanKey}`);
    return cleanKey;
  } catch (error) {
    console.error("Azure Blob Upload Error:", error);
    throw error;
  }
};

// Alias for clarity in new code
export const uploadFileToBlob = uploadFileToS3;

/**
 * Download a blob and return its readable stream and metadata.
 * Used by the file proxy route.
 */
export async function downloadBlob(key: string, range?: string) {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const blobClient = containerClient.getBlockBlobClient(cleanKey);

  if (range) {
    // Parse HTTP Range header: "bytes=START-END"
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const offset = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : undefined;
      const count = end !== undefined ? end - offset + 1 : undefined;

      const downloadResponse = await blobClient.download(offset, count);
      const properties = await blobClient.getProperties();
      const totalSize = properties.contentLength || 0;
      const actualEnd = count !== undefined ? offset + count - 1 : totalSize - 1;

      return {
        body: downloadResponse.readableStreamBody,
        contentType: properties.contentType || "application/octet-stream",
        contentLength: count || totalSize - offset,
        contentRange: `bytes ${offset}-${actualEnd}/${totalSize}`,
        isPartial: true,
      };
    }
  }

  const downloadResponse = await blobClient.download(0);
  return {
    body: downloadResponse.readableStreamBody,
    contentType:
      downloadResponse.contentType || "application/octet-stream",
    contentLength: downloadResponse.contentLength,
    contentRange: undefined,
    isPartial: false,
  };
}

/**
 * Check if a blob exists.
 */
export async function blobExists(key: string): Promise<boolean> {
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const blobClient = containerClient.getBlockBlobClient(cleanKey);
  return blobClient.exists();
}

/**
 * List blobs in the container (optional prefix).
 */
export async function listBlobs(prefix?: string) {
  const blobs: { name: string; size: number }[] = [];
  for await (const blob of containerClient.listBlobsFlat({
    prefix,
  })) {
    blobs.push({
      name: blob.name,
      size: blob.properties.contentLength || 0,
    });
  }
  return blobs;
}

export { containerClient };
