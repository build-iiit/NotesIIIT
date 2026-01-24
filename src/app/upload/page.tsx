"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Folder } from "lucide-react";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [folderId, setFolderId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const { data: allFolders } = api.folders.getAll.useQuery({});
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
                folderId: folderId || undefined,
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
            {/* Sunset Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/15 via-pink-500/15 to-purple-600/15 rounded-xl -z-10" />

            {/* Layered Glass Container - iOS Style */}
            <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-white/[0.12] dark:from-black/15 dark:via-black/10 dark:to-black/15 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.15)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] border border-white/30 dark:border-white/15 p-8">
                {/* Inner glass layer */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
                <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Upload Note</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl backdrop-blur-2xl bg-white/30 dark:bg-black/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all shadow-inner"
                            placeholder="Enter note title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/40 dark:bg-black/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[100px] transition-all"
                            placeholder="Add a description (optional)"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Folder (Optional)</label>
                        <select
                            value={folderId || ""}
                            onChange={(e) => setFolderId(e.target.value || null)}
                            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/40 dark:bg-black/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-gray-900 dark:text-white transition-all"
                        >
                            <option value="">No Folder (Root)</option>
                            {allFolders && (allFolders as any).folders?.map((folder: any) => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">PDF File</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            required
                            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/40 dark:bg-black/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-orange-500 file:to-pink-500 file:text-white hover:file:from-orange-600 hover:file:to-pink-600 file:cursor-pointer transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={uploading || !file}
                        className="w-full backdrop-blur-md bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg hover:shadow-xl border border-white/30"
                    >
                        {uploading ? "Uploading..." : "Upload Note"}
                    </button>
                </form>
            </div>
        </div>
    );
}
