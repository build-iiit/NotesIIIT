"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react";

type UploadStep = "idle" | "getting-url" | "uploading" | "creating-record" | "complete";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [folderId, setFolderId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const { data: allFoldersData } = api.folders.getAllFlat.useQuery();

    // Helper to build folder hierarchy
    const getFolderOptions = () => {
        if (!allFoldersData) return [];

        const folderMap = new Map();
        allFoldersData.forEach((f: any) => folderMap.set(f.id, { ...f, children: [] })); // eslint-disable-line @typescript-eslint/no-explicit-any
        const rootFolders: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

        folderMap.forEach((f) => {
            if (f.parentId && folderMap.has(f.parentId)) {
                folderMap.get(f.parentId).children.push(f);
            } else {
                rootFolders.push(f);
            }
        });

        // Flatten for display with indentation
        const options: { id: string, name: string, level: number }[] = [];
        const traverse = (folders: any[], level = 0) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            folders.sort((a, b) => a.name.localeCompare(b.name));
            folders.forEach(f => {
                options.push({ id: f.id, name: f.name, level });
                if (f.children.length > 0) traverse(f.children, level + 1);
            });
        };
        traverse(rootFolders);
        return options;
    };

    const folderOptions = getFolderOptions();

    const getUploadUrlMutation = api.notes.getUploadUrl.useMutation();
    const createNoteMutation = api.notes.create.useMutation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                setFile(droppedFile);
            } else {
                alert("Please upload a PDF file");
            }
        }
    }, []);

    const removeFile = () => {
        setFile(null);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            setUploading(true);
            setUploadProgress(0);

            // 1. Get Presigned URL
            setUploadStep("getting-url");
            setUploadProgress(10);
            console.log("Step 1: Requesting presigned URL...");
            const { url, s3Key } = await getUploadUrlMutation.mutateAsync({
                filename: file.name,
                contentType: file.type,
            });
            console.log("Step 1 Success: Got URL", url);
            setUploadProgress(30);

            // 2. Upload to S3
            setUploadStep("uploading");
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
            setUploadProgress(70);

            // 3. Create Note Record
            setUploadStep("creating-record");
            console.log("Step 3: Creating note record...");
            await createNoteMutation.mutateAsync({
                title,
                description,
                s3Key,
                folderId: folderId || undefined,
            });
            console.log("Step 3 Success: Note created");
            setUploadProgress(100);
            setUploadStep("complete");

            // Small delay to show completion
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 500);
        } catch (error: unknown) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}\n\nCheck browser console for details.`);
            setUploadStep("idle");
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const getStepMessage = () => {
        switch (uploadStep) {
            case "getting-url":
                return "Getting upload URL...";
            case "uploading":
                return "Uploading to cloud...";
            case "creating-record":
                return "Creating note record...";
            case "complete":
                return "Upload complete!";
            default:
                return "";
        }
    };

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-xl mx-auto">
                {/* Sunset Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-pink-500/5 to-purple-600/5 rounded-xl -z-10" />

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
                                className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/40 dark:bg-black/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-gray-900 dark:text-white transition-all text-sm"
                            >
                                <option value="">No Folder (Root)</option>
                                {folderOptions.map((folder) => (
                                    <option key={folder.id} value={folder.id}>
                                        {'\u00A0\u00A0'.repeat(folder.level)} {folder.level > 0 ? '↳ ' : ''}{folder.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* File Upload Zone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                PDF File *
                            </label>

                            {!file ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${dragActive
                                        ? "border-white bg-white/20 scale-105"
                                        : "border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="h-12 w-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-800 dark:text-white font-medium mb-1">
                                        Drop your PDF here, or click to browse
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        PDF files only
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white/10 border border-white/20 rounded-lg p-4 flex items-center gap-4">
                                    <div className="bg-gray-200 dark:bg-white/20 p-3 rounded-lg">
                                        <FileText className="h-8 w-8 text-gray-700 dark:text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 dark:text-white font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        disabled={uploading}
                                        className="relative flex items-center justify-center p-2 rounded-lg backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] disabled:opacity-50"
                                    >
                                        <X className="h-5 w-5 text-gray-700 dark:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-800 dark:text-white">
                                    <span className="font-medium">{getStepMessage()}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={uploading || !file}
                            className="w-full flex items-center justify-center py-3 px-4 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200 relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : uploadStep === "complete" ? (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Upload Complete!</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5" />
                                    <span>Upload Note</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
                </p>
            </div>
        </div>
    );
}
