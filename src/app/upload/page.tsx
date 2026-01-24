"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2, Search, ChevronDown } from "lucide-react";

type UploadStep = "idle" | "uploading" | "creating-record" | "complete";

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

    // Click outside handler
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

    // Helper to build folder hierarchy
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

    const filteredCourses = courses?.filter((course: { id: string; name: string; code: string }) =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.code.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"];

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

            // 1. Upload to local API
            setUploadStep("uploading");
            setUploadProgress(20);

            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || "Upload failed");
            }

            const uploadResult = await uploadResponse.json();
            const s3Key = uploadResult.key;

            setUploadProgress(60);

            // 2. Create Note Record
            setUploadStep("creating-record");
            await createNoteMutation.mutateAsync({
                title,
                description,
                s3Key,
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
            }, 500);
        } catch (error: unknown) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setUploadStep("idle");
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const getStepMessage = () => {
        switch (uploadStep) {
            case "uploading":
                return "Uploading file...";
            case "creating-record":
                return "Creating note record...";
            case "complete":
                return "Upload complete!";
            default:
                return "";
        }
    };

    return (
        <div className="min-h-screen py-12 px-4 relative overflow-hidden pt-24">
            {/* Background */}
            {/* Background - Removed to use global theme */}
            {/* <div className="fixed inset-0 -z-20 bg-white dark:bg-black" /> */}
            {/* Background - Removed to use global theme */}
            {/* <div className="fixed top-0 left-0 right-0 h-[45vh] bg-gradient-to-b from-orange-300/30 via-rose-200/10 to-transparent dark:from-orange-700/20 dark:via-rose-600/10 dark:to-transparent -z-10" /> */}
            {/* <div className="fixed bottom-0 left-0 right-0 h-[45vh] bg-gradient-to-t from-purple-300/30 via-fuchsia-200/10 to-transparent dark:from-purple-800/20 dark:via-fuchsia-600/10 dark:to-transparent -z-10" /> */}

            <div className="max-w-2xl mx-auto">
                {/* Glass Container */}
                <div className="backdrop-blur-3xl bg-white/30 dark:bg-black/30 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] border border-white/50 dark:border-white/10 p-8">
                    <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Upload Note
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                Title *
                            </label>
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
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                Course (Optional)
                            </label>
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
                                    <X
                                        className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500"
                                        onClick={() => { setCourseSearch(""); setSelectedCourseId(""); }}
                                    />
                                )}
                            </div>
                            {isCourseDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl max-h-48 overflow-y-auto ring-1 ring-black/5">
                                    {filteredCourses?.map((c: { id: string; code: string; name: string }) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCourseId(c.id);
                                                setCourseSearch(`${c.code} - ${c.name}`);
                                                setIsCourseDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-500/10 text-sm border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors"
                                        >
                                            <span className="font-bold text-orange-600 dark:text-orange-400">{c.code}</span>
                                            {" — "}
                                            <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
                                        </button>
                                    ))}
                                    {filteredCourses?.length === 0 && (
                                        <div className="p-4 text-center text-gray-500 text-sm">No courses found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Semester Selector */}
                            <div className="relative" ref={semesterDropdownRef}>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                    Semester
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 flex justify-between items-center text-sm text-gray-900 dark:text-white"
                                >
                                    {selectedSemester ? `Sem ${selectedSemester}` : "Select Semester"}
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </button>
                                {isSemesterDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 p-1 shadow-2xl ring-1 ring-black/5">
                                        {semesters.map(sem => (
                                            <button
                                                key={sem}
                                                type="button"
                                                onClick={() => { setSelectedSemester(sem); setIsSemesterDropdownOpen(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedSemester === sem ? "bg-orange-500/20 text-orange-600 font-bold" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                                            >
                                                Semester {sem}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Folder Selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                    Folder
                                </label>
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

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all h-24 resize-none text-gray-900 dark:text-white"
                                placeholder="Brief summary of the notes..."
                            />
                        </div>

                        {/* File Upload Zone */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                PDF File *
                            </label>

                            {!file ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${dragActive
                                        ? "border-orange-500 bg-orange-500/10 scale-[1.02]"
                                        : "border-white/30 dark:border-white/10 bg-white/5 hover:border-orange-400/50 hover:bg-orange-500/5"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                                        Drop your PDF here, or click to browse
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                        PDF files only
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="bg-orange-500/20 p-3 rounded-xl">
                                        <FileText className="h-8 w-8 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 dark:text-white font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        disabled={uploading}
                                        className="p-2 rounded-xl bg-white/20 dark:bg-black/20 border border-white/20 hover:bg-red-500/20 hover:border-red-400/50 transition-all disabled:opacity-50"
                                    >
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
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Visibility Selector */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                Visibility
                            </label>
                            <div className="flex gap-2 p-1 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl">
                                {(["PUBLIC", "PRIVATE", "GROUP"] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setVisibility(v)}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${visibility === v
                                            ? "bg-orange-500 text-white shadow-md"
                                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                                            }`}
                                    >
                                        {v.charAt(0) + v.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group Selection */}
                        {visibility === "GROUP" && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                    Select Groups
                                </label>
                                <div className="max-h-48 overflow-y-auto p-2 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl space-y-1">
                                    {userGroups?.length === 0 ? (
                                        <div className="text-center py-4 text-xs text-gray-500">
                                            You are not in any groups.
                                        </div>
                                    ) : (
                                        userGroups?.map((group) => (
                                            <label
                                                key={group.id}
                                                className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroupIds.includes(group.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGroupIds([...selectedGroupIds, group.id]);
                                                        } else {
                                                            setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {group.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {group._count.members} members
                                                    </div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={uploading || !file || !title || (visibility === "GROUP" && selectedGroupIds.length === 0)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
