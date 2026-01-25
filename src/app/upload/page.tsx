"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2, Search, ChevronDown } from "lucide-react";

type UploadStep = "idle" | "uploading" | "creating-record" | "complete";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [folderId, setFolderId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    // Course & Semester State
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedSemester, setSelectedSemester] = useState<string>("");
    const [courseSearch, setCourseSearch] = useState("");
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);

    // Visibility State
    const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE" | "GROUP">("PUBLIC");
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);

    const { data: allFoldersData } = api.folders.getAllFlat.useQuery();
    const { data: courses } = api.course.getAll.useQuery();
    const { data: userGroups } = api.social.getGroups.useQuery();
    const createNoteMutation = api.notes.create.useMutation();

    const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"];

    // Click outside handler to close dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsCourseDropdownOpen(false);
            }
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Initialize PDF.js worker
    useEffect(() => {
        const initPdf = async () => {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        };
        initPdf();
    }, []);

    // Thumbnail Generator Logic
    const generateThumbnail = async (pdfFile: File): Promise<File | null> => {
        try {
            const pdfjsLib = await import("pdfjs-dist");
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            const originalViewport = page.getViewport({ scale: 1.0 });
            const maxWidth = 400;
            const scale = maxWidth / originalViewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) return null;

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (!blob) resolve(null);
                    else resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
                }, "image/jpeg", 0.8);
            });
        } catch (error) {
            console.error("Thumbnail generation failed:", error);
            return null;
        }
    };

    // File Input Handler
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const thumb = await generateThumbnail(selectedFile);
            if (thumb) setThumbnailFile(thumb);
        }
    };

    // Drag and Drop Handlers (Main Strategy - Callback Optimized)
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                setFile(droppedFile);
                const thumb = await generateThumbnail(droppedFile);
                if (thumb) setThumbnailFile(thumb);
            } else {
                alert("Please upload a PDF file");
            }
        }
    }, []);

    const removeFile = () => {
        setFile(null);
        setThumbnailFile(null);
    };

    // Folder Hierarchy Builder
    const getFolderOptions = () => {
        if (!allFoldersData) return [];
        type FolderItem = { id: string; name: string; parentId: string | null; children: FolderItem[] };
        const folderMap = new Map<string, FolderItem>();
        allFoldersData.forEach((f) => folderMap.set(f.id, { ...f, children: [] }));
        const rootFolders: FolderItem[] = [];

        folderMap.forEach((f) => {
            if (f.parentId && folderMap.has(f.parentId)) {
                folderMap.get(f.parentId)!.children.push(f);
            } else {
                rootFolders.push(f);
            }
        });

        const options: { id: string, name: string, level: number }[] = [];
        const traverse = (folders: FolderItem[], level = 0) => {
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

    const filteredCourses = courses?.filter((course) =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.code.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        try {
            setUploading(true);
            setUploadStep("uploading");
            setUploadProgress(10);

            let thumbnailKey: string | undefined;

            // 1. Upload PDF to S3 via API
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
            if (!uploadResponse.ok) throw new Error("PDF upload failed");
            const { key: pdfS3Key } = await uploadResponse.json();

            setUploadProgress(40);

            // 2. Upload Thumbnail to S3
            if (thumbnailFile) {
                const thumbFormData = new FormData();
                thumbFormData.append("file", thumbnailFile);
                const thumbResponse = await fetch("/api/upload", { method: "POST", body: thumbFormData });
                if (thumbResponse.ok) {
                    const { key } = await thumbResponse.json();
                    thumbnailKey = key;
                }
            }

            setUploadProgress(70);

            // 3. Create Database Record
            setUploadStep("creating-record");
            await createNoteMutation.mutateAsync({
                title,
                description,
                s3Key: pdfS3Key,
                thumbnailS3Key: thumbnailKey,
                folderId: folderId || undefined,
                courseId: selectedCourseId || undefined,
                semester: selectedSemester || undefined,
                visibility,
                groupIds: visibility === "GROUP" ? selectedGroupIds : undefined,
            });

            setUploadProgress(100);
            setUploadStep("complete");

            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 800);
        } catch (error) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setUploadStep("idle");
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    const getStepMessage = () => {
        switch (uploadStep) {
            case "uploading": return "Uploading files to cloud...";
            case "creating-record": return "Saving note details...";
            case "complete": return "Done!";
            default: return "";
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 relative overflow-hidden pt-24">
            <div className="max-w-2xl mx-auto">
                <div className="backdrop-blur-3xl bg-white/30 dark:bg-black/30 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] border border-white/50 dark:border-white/10 p-8">
                    <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Upload Note
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white"
                                placeholder="Enter note title"
                            />
                        </div>

                        {/* Course Selector */}
                        <div className="relative" ref={courseDropdownRef}>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Course (Optional)</label>
                            <div className="flex items-center px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                                <Search className="h-4 w-4 text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    value={courseSearch}
                                    onChange={(e) => { setCourseSearch(e.target.value); setIsCourseDropdownOpen(true); }}
                                    onFocus={() => setIsCourseDropdownOpen(true)}
                                    placeholder="Search for a course..."
                                    className="bg-transparent outline-none w-full text-sm text-gray-900 dark:text-white"
                                />
                                {courseSearch && (
                                    <X className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => { setCourseSearch(""); setSelectedCourseId(""); }} />
                                )}
                            </div>
                            {isCourseDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl max-h-48 overflow-y-auto">
                                    {filteredCourses?.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCourseId(c.id);
                                                setCourseSearch(`${c.code} - ${c.name}`);
                                                setIsCourseDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-500/10 text-sm border-b border-gray-100 dark:border-white/5 last:border-0"
                                        >
                                            <span className="font-bold text-orange-600 dark:text-orange-400">{c.code}</span> — <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Semester Selector */}
                            <div className="relative" ref={semesterDropdownRef}>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Semester</label>
                                <button
                                    type="button"
                                    onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 flex justify-between items-center text-sm text-gray-900 dark:text-white"
                                >
                                    {selectedSemester ? `Sem ${selectedSemester}` : "Select Semester"}
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </button>
                                {isSemesterDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 p-1 shadow-2xl">
                                        {semesters.map(sem => (
                                            <button
                                                key={sem}
                                                type="button"
                                                onClick={() => { setSelectedSemester(sem); setIsSemesterDropdownOpen(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedSemester === sem ? "bg-orange-500/20 text-orange-600 font-bold" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                                            >
                                                Semester {sem}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Folder Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Folder</label>
                                <div className="relative">
                                    <select
                                        value={folderId || ""}
                                        onChange={(e) => setFolderId(e.target.value || null)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 outline-none text-sm appearance-none cursor-pointer text-gray-900 dark:text-white"
                                    >
                                        <option value="">📁 Root (No Folder)</option>
                                        {folderOptions.map((folder) => (
                                            <option key={folder.id} value={folder.id}>
                                                {'\u00A0\u00A0'.repeat(folder.level)} {folder.level > 0 ? '↳ ' : '📂 '}{folder.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* File Upload Zone */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">PDF File *</label>
                            {!file ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${dragActive ? "border-orange-500 bg-orange-500/10 scale-[1.02]" : "border-white/30 dark:border-white/10 bg-white/5 hover:border-orange-400/50 hover:bg-orange-500/5"}`}
                                >
                                    <input type="file" accept=".pdf" onChange={handleFileChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Drop your PDF here, or click to browse</p>
                                    <p className="text-gray-500 text-sm">PDF files only</p>
                                </div>
                            ) : (
                                <div className="bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="bg-orange-500/20 p-3 rounded-xl">
                                        <FileText className="h-8 w-8 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 dark:text-white font-medium truncate">{file.name}</p>
                                        <p className="text-gray-500 text-sm">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button type="button" onClick={removeFile} disabled={uploading} className="p-2 rounded-xl bg-white/20 dark:bg-black/20 border border-white/20 hover:bg-red-500/20 transition-all">
                                        <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">{getStepMessage()}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-white/20 dark:bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Visibility Selector */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Visibility</label>
                            <div className="flex gap-2 p-1 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl">
                                {(["PUBLIC", "PRIVATE", "GROUP"] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setVisibility(v)}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${visibility === v ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}
                                    >
                                        {v.charAt(0) + v.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group Selection */}
                        {visibility === "GROUP" && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Select Groups</label>
                                <div className="max-h-48 overflow-y-auto p-2 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl space-y-1">
                                    {userGroups?.length === 0 ? (
                                        <div className="text-center py-4 text-xs text-gray-500">You are not in any groups.</div>
                                    ) : (
                                        userGroups?.map((group) => (
                                            <label key={group.id} className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroupIds.includes(group.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedGroupIds([...selectedGroupIds, group.id]);
                                                        else setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-orange-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{group.name}</div>
                                                    <div className="text-xs text-gray-500">{group._count.members} members</div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploading || !file || !title || (visibility === "GROUP" && selectedGroupIds.length === 0)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /><span>Uploading...</span></>
                            ) : uploadStep === "complete" ? (
                                <><CheckCircle className="h-5 w-5" /><span>Upload Complete!</span></>
                            ) : (
                                <><Upload className="h-5 w-5" /><span>Upload Note</span></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}