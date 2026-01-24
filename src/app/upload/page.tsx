"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type UploadStep = "idle" | "getting-url" | "uploading" | "creating-record" | "complete";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

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
            });
            console.log("Step 3 Success: Note created");
            setUploadProgress(100);
            setUploadStep("complete");

            // Small delay to show completion
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 500);
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error.message || "Unknown error"}\n\nCheck browser console for details.`);
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12 px-4 sm:px-6 lg:px-8 relative dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
                <ThemeToggle className="text-white hover:bg-white/20" />
            </div>

            {/* Back to Home */}
            <div className="absolute top-4 left-4">
                <button
                    onClick={() => router.push("/")}
                    className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    ← Back to Home
                </button>
            </div>

            {/* Background decorations */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="w-full max-w-2xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-white/20 p-4 rounded-full mb-4 shadow-lg backdrop-blur-sm border border-white/30 inline-block">
                        <Upload className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white drop-shadow-md tracking-tight">
                        Upload Note
                    </h1>
                    <p className="mt-2 text-lg text-white/90 font-medium">
                        Share your knowledge with the community
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 py-8 px-6 sm:px-10 shadow-2xl rounded-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g., Linear Algebra Lecture Notes"
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                            />
                        </div>

                        {/* Description Input */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a brief description of the notes..."
                                rows={3}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200 backdrop-blur-sm resize-none"
                            />
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
        </div>
    );
}
