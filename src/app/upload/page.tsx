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

    const { data: allFolders } = api.folders.getAll.useQuery({});
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
                            {allFolders && (allFolders as { folders: { id: string; name: string }[] }).folders?.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* File Upload Zone */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
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
                                <Upload className="h-12 w-12 text-white/70 mx-auto mb-4" />
                                <p className="text-white font-medium mb-1">
                                    Drop your PDF here, or click to browse
                                </p>
                                <p className="text-white/60 text-sm">
                                    PDF files only
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white/10 border border-white/20 rounded-lg p-4 flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <FileText className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-white/60 text-sm">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    disabled={uploading}
                                    className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
                                >
                                    <X className="h-5 w-5 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-white">
                                <span className="font-medium">{getStepMessage()}</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
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
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-indigo-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 gap-2"
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

            <p className="mt-6 text-center text-xs text-white/60">
                &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
            </p>
        </div>
    );
}
