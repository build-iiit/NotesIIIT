"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2, Search } from "lucide-react";


type UploadStep = "idle" | "getting-url" | "uploading" | "creating-record" | "complete";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "complete">("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Course Selection State
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedSemester, setSelectedSemester] = useState<string>(""); // New Semester State
    const [courseSearch, setCourseSearch] = useState("");
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

    // Semester Options
    const semesters = [
        "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"
    ];

    // Fetch courses
    const { data: courses } = api.course.getAll.useQuery();

    // Filter courses client-side for better UX
    const filteredCourses = courses?.filter((c: any) =>
        c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.branch.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const getUploadUrlMutation = api.notes.getUploadUrl.useMutation();
    const createNoteMutation = api.notes.create.useMutation({
        onSuccess: () => {
            setUploadStep("complete");
            setUploadProgress(100);
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 1000);
        },
        onError: (err) => {
            setError(err.message);
            setUploadStep("idle");
            setUploadProgress(0);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                setFile(droppedFile);
                setError(null);
            } else {
                setError("Please upload a PDF file.");
            }
        }
    };

    const removeFile = () => {
        setFile(null);
        setError(null);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) {
            setError("Title and PDF file are required.");
            return;
        }

        try {
            setError(null);
            setUploadProgress(0);
            setUploadStep("uploading");

            // 1. Get Presigned URL
            setUploadProgress(10);
            console.log("Step 1: Requesting presigned URL...");
            const { url, s3Key } = await getUploadUrlMutation.mutateAsync({
                filename: file.name,
                contentType: file.type,
            });
            console.log("Step 1 Success: Got URL", url);
            setUploadProgress(30);

            // 2. Upload to S3
            console.log("Step 2: Uploading to S3...", url);

            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
            }
            console.log("Step 2 Success: File uploaded");
            setUploadProgress(70);

            // 3. Create Note Record
            console.log("Step 3: Creating note record...");
            await createNoteMutation.mutateAsync({
                title,
                description,
                s3Key,
                fileSize: file.size,
                courseId: selectedCourseId || undefined,
                semester: selectedSemester || undefined,
            });
            console.log("Step 3 Success: Note created");

        } catch (error: any) {
            console.error("Upload failed:", error);
            setError(error.message || "An unknown error occurred");
            setUploadStep("idle");
            setUploadProgress(0);
        }
    };

    const getStepMessage = () => {
        if (uploadStep === "uploading") return "Uploading to storage...";
        if (uploadStep === "complete") return "Redirecting...";
        return "Preparing...";
    };

    const isUploading = uploadStep === "uploading" || uploadStep === "complete";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">

            {/* Back to Home */}
            <div className="absolute top-4 left-4">
                <button
                    onClick={() => router.push("/")}
                    className="text-white hover:text-primary hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    ← Back to Home
                </button>
            </div>

            <div className="w-full max-w-2xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-card p-4 rounded-full mb-4 shadow-lg backdrop-blur-sm border border-primary/20 inline-block animate-pulse">
                        <Upload className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white drop-shadow-md tracking-tight">
                        Upload Note
                    </h1>
                    <p className="mt-2 text-lg text-gray-300 font-medium">
                        Share your knowledge with the community
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-card backdrop-blur-lg border border-border py-8 px-6 sm:px-10 shadow-2xl rounded-xl relative overflow-hidden group">
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g., Linear Algebra Lecture Notes"
                                className="w-full bg-black/40 border border-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                        </div>

                        {/* Course Selector (Searchable) */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-200 mb-2">
                                Course
                            </label>
                            <div className="relative">
                                <div className="flex items-center bg-black/40 border border-white/10 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-200">
                                    <Search className="h-5 w-5 text-gray-500 ml-3" />
                                    <input
                                        type="text"
                                        value={courseSearch}
                                        onChange={(e) => {
                                            setCourseSearch(e.target.value);
                                            setSelectedCourseId(""); // Clear selection on search change to force re-selection
                                            setIsCourseDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsCourseDropdownOpen(true)}
                                        // onBlur={() => setTimeout(() => setIsCourseDropdownOpen(false), 200)} // Delay to allow click
                                        placeholder="Search for a course (e.g., CS1.201, Data Structures)..."
                                        className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 focus:outline-none"
                                    />
                                    {courseSearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCourseSearch("");
                                                setSelectedCourseId("");
                                            }}
                                            className="p-2 mr-1 hover:text-white text-gray-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown Results */}
                                {isCourseDropdownOpen && (
                                    <div className="absolute z-[100] w-full mt-1 bg-black/95 border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto backdrop-blur-xl ring-1 ring-white/10">
                                        {!courses?.length ? (
                                            <div className="p-4 text-center text-gray-400 text-sm">
                                                Loading courses or no courses found. <br />
                                                <span className="text-xs text-gray-600">(Check if database is seeded)</span>
                                            </div>
                                        ) : filteredCourses?.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400 text-sm">
                                                No courses found matching "{courseSearch}"
                                            </div>
                                        ) : (
                                            filteredCourses?.map((course: any) => (
                                                <button
                                                    key={course.id}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur
                                                        setSelectedCourseId(course.id);
                                                        setCourseSearch(`${course.code} - ${course.name}`);
                                                        setIsCourseDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex flex-col group"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-white text-sm">{course.code}</span>
                                                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{course.branch}</span>
                                                    </div>
                                                    <span className="text-gray-300 text-sm truncate">{course.name}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Semester Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">
                                Semester (Optional)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {semesters.map((sem) => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() => setSelectedSemester(selectedSemester === sem ? "" : sem)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${selectedSemester === sem
                                            ? "bg-primary text-white border-primary"
                                            : "bg-black/40 text-gray-400 border-white/10 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        {sem}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Description Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a brief description of the notes..."
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                            />
                        </div>

                        {/* File Upload Zone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">
                                PDF File *
                            </label>

                            {!file ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${dragActive
                                        ? "border-primary bg-primary/10 scale-105"
                                        : "border-white/20 bg-black/20 hover:border-primary/50 hover:bg-black/40"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                                    <p className="text-white font-medium mb-1">
                                        Drop your PDF here, or click to browse
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        PDF files only
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-black/30 border border-primary/30 rounded-lg p-4 flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-lg">
                                        <FileText className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        disabled={isUploading}
                                        className="hover:bg-red-500/20 p-2 rounded-lg transition-colors duration-200 disabled:opacity-50 group"
                                    >
                                        <X className="h-5 w-5 text-gray-400 group-hover:text-red-500" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-white">
                                    <span className="font-medium">{getStepMessage()}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-4 text-sm text-red-200 backdrop-blur-sm">
                                <p className="font-bold">Upload Failed</p>
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isUploading || !file}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-black font-bold text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 gap-2"
                        >
                            {isUploading ? (
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

                <p className="mt-6 text-center text-xs text-gray-500">
                    &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
                </p>
            </div>
        </div>
    );
}
