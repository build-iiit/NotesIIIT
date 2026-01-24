"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    const getUploadUrlMutation = api.notes.getUploadUrl.useMutation();
    const createNoteMutation = api.notes.create.useMutation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            setUploading(true);

            // 1. Get Presigned URL
            console.log("Step 1: Requesting presigned URL...");
            const { url, s3Key } = await getUploadUrlMutation.mutateAsync({
                filename: file.name,
                contentType: file.type,
            });
            console.log("Step 1 Success: Got URL", url);

            // 2. Upload to S3
            console.log("Step 2: Uploading to S3...");
            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }
            console.log("Step 2 Success: File uploaded");

            // 3. Create Note Record
            console.log("Step 3: Creating note record...");
            await createNoteMutation.mutateAsync({
                title,
                description,
                s3Key,
            });
            console.log("Step 3 Success: Note created");

            router.push("/");
            router.refresh();
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error.message || "Unknown error"}\n\nCheck browser console for details.`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Upload Note</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full border p-2 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">PDF File</label>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        required
                        className="w-full"
                    />
                </div>
                <button
                    type="submit"
                    disabled={uploading || !file}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {uploading ? "Uploading..." : "Upload Note"}
                </button>
            </form>
        </div>
    );
}
