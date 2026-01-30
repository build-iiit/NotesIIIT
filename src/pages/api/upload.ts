import { NextApiRequest, NextApiResponse } from "next";
import { writeFile, mkdir, appendFile, rename, unlink, readFile } from "fs/promises";
import path from "path";
import { IncomingForm, File as FormidableFile, Fields, Files } from "formidable";
import { existsSync } from "fs";

// Disable default body parser to handle file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

const parseForm = async (
    req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> => {
    return new Promise(async (resolve, reject) => {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "temp");
        try {
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }
        } catch (e) {
            console.error("Error creating directory", e);
        }

        const form = new IncomingForm({
            multiples: true,
            keepExtensions: true,
            uploadDir,
            maxFileSize: 50 * 1024 * 1024, // 50MB per chunk limit
        });

        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { fields, files } = await parseForm(req);

        // helper to get single value
        const getValue = (val: string[] | string | undefined) => {
            if (Array.isArray(val)) return val[0];
            return val;
        };

        const chunkIndexStr = getValue(fields.chunkIndex);
        const totalChunksStr = getValue(fields.totalChunks);
        const uploadId = getValue(fields.uploadId);
        const fileName = getValue(fields.fileName);

        // Handle standard single-file upload (backward compatibility / thumbnail upload)
        if (!chunkIndexStr || !totalChunksStr || !uploadId) {

            // Checks if it's a thumbnail or standard file
            const uploadedFileVal = files.file;
            const uploadedFile = Array.isArray(uploadedFileVal) ? uploadedFileVal[0] : uploadedFileVal;

            if (!uploadedFile) {
                return res.status(400).json({ success: false, error: "No file uploaded" });
            }

            const oldPath = uploadedFile.filepath;
            const originalFilename = uploadedFile.originalFilename || "unknown.pdf";
            const timestamp = Date.now();
            const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
            const newFilename = `${timestamp}-${sanitizedFilename}`;
            const finalDir = path.join(process.cwd(), "public", "uploads");
            if (!existsSync(finalDir)) {
                await mkdir(finalDir, { recursive: true });
            }
            const newPath = path.join(finalDir, newFilename);

            // Move file
            // Use rename if possible, otherwise read/write for cross-device
            try {
                await rename(oldPath, newPath);
            } catch (error) {
                await writeFile(newPath, await readFile(oldPath));
                await unlink(oldPath);
            }

            return res.status(200).json({
                success: true,
                key: `/uploads/${newFilename}`
            });
        }

        // --- Chunked Upload Logic ---
        const chunkIndex = parseInt(chunkIndexStr);
        const totalChunks = parseInt(totalChunksStr);

        const uploadedFileVal = files.file;
        const uploadedChunk = Array.isArray(uploadedFileVal) ? uploadedFileVal[0] : uploadedFileVal;

        if (!uploadedChunk) {
            return res.status(400).json({ success: false, error: "No chunk uploaded" });
        }

        const tempDir = path.join(process.cwd(), "public", "uploads", "temp");
        const tempFilePath = path.join(tempDir, `${uploadId}.part`);

        // Read the chunk data
        const chunkData = await readFile(uploadedChunk.filepath);

        // If chunkIndex is 0, we start fresh. If file exists, we overwrite it.
        // If chunkIndex > 0, we append.

        // Note: For robustness, we could check if file exists for index > 0.
        // But assuming sequential uploads for now.

        if (chunkIndex === 0) {
            await writeFile(tempFilePath, chunkData);
        } else {
            await appendFile(tempFilePath, chunkData);
        }

        // Clean up the formidable chunk file
        try {
            await unlink(uploadedChunk.filepath);
        } catch (e) { }

        // If last chunk, finalize
        if (chunkIndex === totalChunks - 1) {
            const finalDir = path.join(process.cwd(), "public", "uploads");
            if (!existsSync(finalDir)) {
                await mkdir(finalDir, { recursive: true });
            }

            const originalFn = fileName || "unknown.pdf";
            const timestamp = Date.now();
            const sanitizedFn = originalFn.replace(/[^a-zA-Z0-9.-]/g, "_");
            const finalFilename = `${timestamp}-${uploadId}-${sanitizedFn}`;
            const finalPath = path.join(finalDir, finalFilename);

            await rename(tempFilePath, finalPath);

            console.log(`Finalized chunked upload: ${finalPath}`);

            return res.status(200).json({
                success: true,
                key: `/uploads/${finalFilename}`,
                completed: true
            });
        }

        return res.status(200).json({
            success: true,
            chunkIndex,
            message: "Chunk received"
        });

    } catch (error) {
        console.error("Upload handler error:", error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (error as any)?.message || "Internal Server Error";
        return res.status(500).json({ success: false, error: msg });
    }
}
