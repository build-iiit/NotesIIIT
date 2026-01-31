"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2, Search, ChevronDown, Github, FolderOpen, Tag, Plus } from "lucide-react";

type UploadStep = "idle" | "uploading" | "creating-record" | "complete";

interface QueuedFile {
    file: File;
    title: string;
    courseId: string;
    semester: string;
    tagIds: string[];
    status: "pending" | "uploading" | "complete" | "error";
    progress: number;
    error?: string;
}

// Helper to generate thumbnail (Keep this outside component or in a utils file ideally, but here for now)
const generateThumbnail = async (pdfFile: File): Promise<File | null> => {
    try {
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

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
            viewport: scaledViewport,
            canvas: canvas
        } as any).promise;

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

// Helper to recursively extract PDF files from a dropped folder
async function extractPdfsFromEntry(entry: FileSystemEntry): Promise<File[]> {
    const files: File[] = [];

    if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
        });
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            files.push(file);
        }
    } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });
        for (const childEntry of entries) {
            const childFiles = await extractPdfsFromEntry(childEntry);
            files.push(...childFiles);
        }
    }

    return files;
}

interface UploadFormProps {
    initialFolderId?: string | null;
    onSuccess?: (note: any) => void;
    // If provided, we are in "Fulfillment Mode" where we just return the created note ID
    // instead of redirecting
    isFulfillmentMode?: boolean;
}

export function UploadForm({ initialFolderId = null, onSuccess, isFulfillmentMode = false }: UploadFormProps) {
    const router = useRouter();

    // Multi-file state
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
    const [folderId, setFolderId] = useState<string | null>(initialFolderId);
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
    const [overallProgress, setOverallProgress] = useState(0);
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

    // Tags State
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [customTagInput, setCustomTagInput] = useState("");
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    // Upload Mode State (local, github, drive)
    const [uploadMode, setUploadMode] = useState<"local" | "github">("local");
    const [githubUrl, setGithubUrl] = useState("");
    const [isFetchingGithub, setIsFetchingGithub] = useState(false);
    const [driveUploadProgress, setDriveUploadProgress] = useState("");
    const [driveProgressPercent, setDriveProgressPercent] = useState(0);

    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);

    const { data: allFoldersData } = api.folders.getAllFlat.useQuery();
    const { data: courses } = api.course.getAll.useQuery();
    const { data: userGroups } = api.social.getGroups.useQuery();
    const { data: tags } = api.tags.getAll.useQuery();
    const createNoteMutation = api.notes.create.useMutation();
    const createTagMutation = api.tags.create.useMutation();

    const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"];

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) setIsCourseDropdownOpen(false);
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) setIsSemesterDropdownOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addFilesToQueue = useCallback((files: File[]) => {
        const newQueued: QueuedFile[] = files.map((file) => ({
            file,
            title: file.name.replace(/\.[^/.]+$/, ""),
            courseId: selectedCourseId,
            semester: selectedSemester,
            tagIds: selectedTagIds,
            status: "pending" as const,
            progress: 0,
        }));
        setQueuedFiles((prev) => {
            const updated = [...prev, ...newQueued];
            // Auto-select first file if none selected
            if (selectedFileIndex === null && updated.length > 0) {
                setSelectedFileIndex(0);
            }
            return updated;
        });
    }, [selectedCourseId, selectedSemester, selectedTagIds, selectedFileIndex]);


    // Get the currently selected file
    const selectedFile = selectedFileIndex !== null ? queuedFiles[selectedFileIndex] : null;

    // When a file is selected, update the global controls to show its values
    useEffect(() => {
        if (selectedFile && selectedFile.status === "pending") {
            setSelectedCourseId(selectedFile.courseId);
            setSelectedSemester(selectedFile.semester);
            // Update course search display
            const course = courses?.find(c => c.id === selectedFile.courseId);
            setCourseSearch(course ? `${course.code} - ${course.name}` : "");
        }
    }, [selectedFileIndex, courses]); // eslint-disable-line react-hooks/exhaustive-deps

    // When global course/semester changes, update the selected file
    const handleCourseSelect = (courseId: string, displayText: string) => {
        setSelectedCourseId(courseId);
        setCourseSearch(displayText);
        setIsCourseDropdownOpen(false);
        if (selectedFileIndex !== null && queuedFiles[selectedFileIndex]?.status === "pending") {
            updateFileInQueue(selectedFileIndex, { courseId });
        }
    };

    const handleSemesterSelect = (semester: string) => {
        setSelectedSemester(semester);
        setIsSemesterDropdownOpen(false);
        if (selectedFileIndex !== null && queuedFiles[selectedFileIndex]?.status === "pending") {
            updateFileInQueue(selectedFileIndex, { semester });
        }
    };

    const handleTitleChange = (title: string) => {
        if (selectedFileIndex !== null && queuedFiles[selectedFileIndex]?.status === "pending") {
            updateFileInQueue(selectedFileIndex, { title });
        }
    };

    const handleTagToggle = (tagId: string) => {
        setSelectedTagIds(prev => {
            const newTags = prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId];

            // Update selected file's tags
            if (selectedFileIndex !== null && queuedFiles[selectedFileIndex]?.status === "pending") {
                updateFileInQueue(selectedFileIndex, { tagIds: newTags });
            }
            return newTags;
        });
    };

    const handleAddCustomTag = async () => {
        const trimmed = customTagInput.trim();
        if (!trimmed) return;

        try {
            const newTag = await createTagMutation.mutateAsync({ name: trimmed });
            setSelectedTagIds(prev => [...prev, newTag.id]);
            setCustomTagInput("");
            if (selectedFileIndex !== null && queuedFiles[selectedFileIndex]?.status === "pending") {
                updateFileInQueue(selectedFileIndex, { tagIds: [...selectedTagIds, newTag.id] });
            }
        } catch (error) {
            console.error("Failed to create tag:", error);
        }
    };


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const pdfFiles = Array.from(e.target.files).filter(
                (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
            );
            if (pdfFiles.length > 0) {
                addFilesToQueue(pdfFiles);
            } else {
                alert("Please select PDF files only.");
            }
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);

        const items = e.dataTransfer.items;
        const allPdfs: File[] = [];

        // Use webkitGetAsEntry for folder support
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry?.();
                if (entry) {
                    const pdfs = await extractPdfsFromEntry(entry);
                    allPdfs.push(...pdfs);
                }
            }
        }

        // Fallback for browsers without webkitGetAsEntry
        if (allPdfs.length === 0 && e.dataTransfer.files.length > 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                    allPdfs.push(file);
                }
            }
        }

        if (allPdfs.length > 0) {
            addFilesToQueue(allPdfs);
        } else {
            alert("No PDF files found. Please drop PDF files or folders containing PDFs.");
        }
    }, [addFilesToQueue]);

    // GitHub Import Handler
    const handleGithubImport = async () => {
        if (!githubUrl) return;
        try {
            setIsFetchingGithub(true);
            let rawUrl = githubUrl;
            if (githubUrl.includes("github.com") && githubUrl.includes("/blob/")) {
                rawUrl = githubUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
            }
            const response = await fetch(rawUrl);
            if (!response.ok) throw new Error("Failed to fetch file from GitHub");
            const blob = await response.blob();
            const filename = githubUrl.split("/").pop() || "github-import.pdf";
            if (!filename.toLowerCase().endsWith(".pdf") && blob.type !== "application/pdf") {
                throw new Error("The fetched file does not appear to be a PDF");
            }
            const importedFile = new File([blob], filename, { type: "application/pdf" });
            addFilesToQueue([importedFile]);
            setUploadMode("local");
        } catch (error) {
            console.error("GitHub import failed:", error);
            alert(`GitHub import failed: ${error instanceof Error ? error.message : "Check the URL and try again"}`);
        } finally {
            setIsFetchingGithub(false);
        }
    };

    // Google Drive Import Handler (with multi-select)
    const triggerGoogleDrive = () => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!apiKey || !clientId) {
            alert("Google Drive integration is not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file.");
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            callback: async (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const google = (window as any).google;
                    const picker = new google.picker.PickerBuilder()
                        .addView(google.picker.ViewId.PDFS)
                        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                        .setOAuthToken(tokenResponse.access_token)
                        .setDeveloperKey(apiKey)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .setCallback(async (data: any) => {
                            if (data.action === google.picker.Action.PICKED) {
                                const docs = data.docs;
                                try {
                                    setUploading(true);
                                    setDriveUploadProgress(`Downloading ${docs.length} file(s)...`);
                                    setDriveProgressPercent(10);

                                    const downloadedFiles: File[] = [];
                                    for (let i = 0; i < docs.length; i++) {
                                        const doc = docs[i];
                                        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
                                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                        });
                                        if (!res.ok) throw new Error(`Failed to download ${doc.name}`);
                                        const blob = await res.blob();
                                        downloadedFiles.push(new File([blob], doc.name, { type: "application/pdf" }));
                                        setDriveProgressPercent(10 + Math.round((i + 1) / docs.length * 80));
                                    }

                                    addFilesToQueue(downloadedFiles);
                                    setDriveProgressPercent(100);
                                    setDriveUploadProgress("Ready!");
                                    setTimeout(() => { setDriveUploadProgress(""); setDriveProgressPercent(0); }, 1500);
                                } catch (err) {
                                    alert("Error importing file: " + (err instanceof Error ? err.message : "Unknown error"));
                                    setDriveUploadProgress("");
                                    setDriveProgressPercent(0);
                                } finally {
                                    setUploading(false);
                                }
                            }
                        })
                        .build();
                    picker.setVisible(true);
                }
            },
        });
        if (client) {
            client.requestAccessToken();
        } else {
            alert("Google API not loaded. Please refresh the page and try again.");
        }
    };

    const getFolderOptions = () => {
        if (!allFoldersData) return [];
        type FolderItem = { id: string; name: string; parentId: string | null; children: FolderItem[] };
        const folderMap = new Map<string, FolderItem>();
        allFoldersData.forEach((f) => folderMap.set(f.id, { ...f, children: [] }));
        const rootFolders: FolderItem[] = [];
        folderMap.forEach((f) => {
            if (f.parentId && folderMap.has(f.parentId)) folderMap.get(f.parentId)!.children.push(f);
            else rootFolders.push(f);
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

    const updateFileInQueue = (index: number, updates: Partial<QueuedFile>) => {
        setQueuedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
    };

    const removeFileFromQueue = (index: number) => {
        setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (queuedFiles.length === 0) return;

        try {
            setUploading(true);
            setUploadStep("uploading");
            setOverallProgress(0);

            const totalFiles = queuedFiles.length;
            let completedFiles = 0;

            for (let i = 0; i < queuedFiles.length; i++) {
                const qf = queuedFiles[i];
                updateFileInQueue(i, { status: "uploading", progress: 10 });

                try {
                    // 1. Generate Thumbnail
                    const thumbnailFile = await generateThumbnail(qf.file);
                    updateFileInQueue(i, { progress: 20 });

                    // 2. Upload PDF
                    const formData = new FormData();
                    formData.append("file", qf.file);
                    const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        throw new Error(`Upload failed: ${errorText || uploadResponse.statusText}`);
                    }
                    const { key: pdfS3Key } = await uploadResponse.json();
                    updateFileInQueue(i, { progress: 50 });

                    // 3. Upload Thumbnail
                    let thumbnailKey: string | undefined;
                    if (thumbnailFile) {
                        const thumbFormData = new FormData();
                        thumbFormData.append("file", thumbnailFile);
                        const thumbResponse = await fetch("/api/upload", { method: "POST", body: thumbFormData });
                        if (thumbResponse.ok) {
                            const { key } = await thumbResponse.json();
                            thumbnailKey = key;
                        }
                    }
                    updateFileInQueue(i, { progress: 70 });

                    // 4. Create Database Record
                    const note = await createNoteMutation.mutateAsync({
                        title: qf.title,
                        s3Key: pdfS3Key,
                        thumbnailS3Key: thumbnailKey,
                        folderId: folderId || undefined,
                        courseId: qf.courseId || undefined,
                        semester: qf.semester || undefined,
                        visibility,
                        groupIds: visibility === "GROUP" ? selectedGroupIds : undefined,
                        tagIds: qf.tagIds.length > 0 ? qf.tagIds : undefined,
                    });

                    updateFileInQueue(i, { status: "complete", progress: 100 });
                    completedFiles++;
                    setOverallProgress(Math.round((completedFiles / totalFiles) * 100));

                    if (onSuccess && i === queuedFiles.length - 1) {
                        onSuccess(note);
                    }
                } catch (error) {
                    console.error(`Failed to upload ${qf.file.name}:`, error);
                    updateFileInQueue(i, { status: "error", error: error instanceof Error ? error.message : "Unknown error" });
                }
            }

            setUploadStep("complete");

            if (!isFulfillmentMode && !onSuccess) {
                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 1000);
            }

        } catch (error) {
            console.error("Upload failed:", error);
            alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setUploadStep("idle");
            setOverallProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + ["Bytes", "KB", "MB", "GB"][i];
    };

    const pendingCount = queuedFiles.filter(f => f.status === "pending").length;
    const completedCount = queuedFiles.filter(f => f.status === "complete").length;

    return (
        <div className={isFulfillmentMode ? "" : "max-w-2xl mx-auto backdrop-blur-3xl bg-white/30 dark:bg-black/30 rounded-3xl shadow-xl border border-white/50 dark:border-white/10 p-8"}>
            {!isFulfillmentMode && (
                <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] bg-clip-text text-transparent">
                    Upload Notes
                </h1>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Course & Semester Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={courseDropdownRef}>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Course</label>
                        <div className="flex items-center px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                            <Search className="h-4 w-4 text-gray-400 mr-2" />
                            <input
                                type="text"
                                value={courseSearch}
                                onChange={(e) => { setCourseSearch(e.target.value); setIsCourseDropdownOpen(true); }}
                                onFocus={() => setIsCourseDropdownOpen(true)}
                                placeholder="Search..."
                                className="bg-transparent outline-none w-full text-sm text-gray-900 dark:text-white"
                            />
                            {courseSearch && <X className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => { setCourseSearch(""); setSelectedCourseId(""); }} />}
                        </div>
                        {isCourseDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl max-h-48 overflow-y-auto">
                                {filteredCourses?.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleCourseSelect(c.id, `${c.code} - ${c.name}`)}
                                        className="w-full text-left px-4 py-3 hover:bg-orange-500/10 text-sm border-b border-gray-100 dark:border-white/5 last:border-0"
                                    >
                                        <span className="font-bold text-orange-600 dark:text-orange-400">{c.code}</span> — <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={semesterDropdownRef}>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Semester</label>
                        <button
                            type="button"
                            onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 flex justify-between items-center text-sm text-gray-900 dark:text-white"
                        >
                            {selectedSemester ? `Sem ${selectedSemester}` : "Select"}
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        {isSemesterDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 p-1 shadow-2xl">
                                {semesters.map(sem => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() => handleSemesterSelect(sem)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedSemester === sem ? "bg-orange-500/20 text-orange-600 font-bold" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
                                    >
                                        Semester {sem}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
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

                {/* Tags Selection */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                        Tags
                    </label>
                    <div className="space-y-3">
                        {/* Selected Tags Display */}
                        {selectedTagIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedTagIds.map(tagId => {
                                    const tag = tags?.find(t => t.id === tagId);
                                    return tag ? (
                                        <span
                                            key={tagId}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary dark:text-primary border border-primary/30 shadow-sm"
                                        >
                                            <Tag className="h-3 w-3" />
                                            {tag.name}
                                            <button
                                                type="button"
                                                onClick={() => handleTagToggle(tagId)}
                                                className="ml-0.5 hover:text-red-500 hover:scale-110 transition-all"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}


                        {/* Tag Options */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 text-sm text-gray-900 dark:text-white hover:border-primary/50 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    {selectedTagIds.length > 0 ? `${selectedTagIds.length} tags selected` : "Select tags..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isTagDropdownOpen && (
                                <div className="absolute z-20 w-full mt-2 backdrop-blur-3xl bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/10 max-h-72 overflow-y-auto">
                                    {/* Decorative gradient blur */}
                                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-[60px] pointer-events-none" />
                                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full blur-[60px] pointer-events-none" />

                                    {/* Default Tags */}
                                    <div className="relative p-3 border-b border-white/20 dark:border-white/10">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 py-1 mb-2">Default Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {tags?.filter(t => t.isDefault).map(tag => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => handleTagToggle(tag.id)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${selectedTagIds.includes(tag.id)
                                                        ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/30"
                                                        : "backdrop-blur-xl bg-white/40 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-white/30 dark:border-white/10 hover:bg-primary/20 hover:border-primary/40 hover:scale-105"
                                                        }`}
                                                >
                                                    {tag.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Tags */}
                                    {tags?.some(t => !t.isDefault) && (
                                        <div className="relative p-3 border-b border-white/20 dark:border-white/10">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 py-1 mb-2">Custom Tags</p>
                                            <div className="flex flex-wrap gap-2">
                                                {tags?.filter(t => !t.isDefault).map(tag => (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => handleTagToggle(tag.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${selectedTagIds.includes(tag.id)
                                                            ? "bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/30"
                                                            : "backdrop-blur-xl bg-white/40 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-white/30 dark:border-white/10 hover:bg-primary/20 hover:border-primary/40 hover:scale-105"
                                                            }`}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Custom Tag */}
                                    <div className="relative p-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 py-1 mb-2">Add Custom Tag</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customTagInput}
                                                onChange={(e) => setCustomTagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomTag())}
                                                placeholder="Type new tag..."
                                                className="flex-1 px-4 py-2.5 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/10 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCustomTag}
                                                disabled={!customTagInput.trim() || createTagMutation.isPending}
                                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* File Upload Zone */}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            PDF Files {queuedFiles.length > 0 && <span className="text-primary">({queuedFiles.length})</span>}
                        </label>
                        {queuedFiles.length === 0 && (
                            <div className="flex bg-white/50 dark:bg-black/50 rounded-lg p-1 border border-white/20">
                                <button type="button" onClick={() => setUploadMode("local")} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === "local" ? "bg-white dark:bg-zinc-800 shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}>Local</button>
                                <button type="button" onClick={() => setUploadMode("github")} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === "github" ? "bg-white dark:bg-zinc-800 shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}>GitHub</button>
                            </div>
                        )}
                    </div>

                    {queuedFiles.length === 0 ? (
                        uploadMode === "local" ? (
                            <div
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${dragActive ? "border-primary bg-primary/10 scale-[1.02]" : "border-white/30 dark:border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5"}`}
                            >
                                <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <Upload className="h-8 w-8 text-gray-400" />
                                    <FolderOpen className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-1">Drop PDFs or folders here</p>
                                <p className="text-gray-500 text-xs mb-4">or click to browse files</p>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); triggerGoogleDrive(); }}
                                    disabled={uploading}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm flex items-center gap-2 transition-all z-10 relative disabled:opacity-50 mx-auto"
                                >
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4" alt="Drive" />
                                    Import from Drive
                                </button>
                                {driveUploadProgress && (
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{driveUploadProgress}</span>
                                            <span className="text-orange-500 font-bold">{driveProgressPercent}%</span>
                                        </div>
                                        <div className="h-2 bg-white/20 dark:bg-black/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] transition-all duration-300 ease-out rounded-full" style={{ width: `${driveProgressPercent}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/5 dark:bg-black/5 border border-white/30 dark:border-white/10 rounded-2xl p-6">
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="https://github.com/username/repo/blob/main/document.pdf"
                                        value={githubUrl}
                                        onChange={(e) => setGithubUrl(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGithubImport}
                                        disabled={isFetchingGithub || !githubUrl}
                                        className="px-6 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 font-bold text-sm transition-colors border border-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isFetchingGithub ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
                                        {isFetchingGithub ? "" : "Import"}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 ml-1">Paste a URL to a PDF file hosted on GitHub.</p>
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            {/* Title Input for Selected File */}
                            {selectedFile && selectedFile.status === "pending" && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                                        Title <span className="text-primary normal-case font-normal">(editing: {selectedFile.file.name})</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedFile.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white text-sm"
                                        placeholder="Enter a title for this note"
                                    />
                                </div>
                            )}

                            {/* File Queue */}
                            <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                                {queuedFiles.map((qf, index) => (
                                    <div
                                        key={index}
                                        onClick={() => qf.status === "pending" && setSelectedFileIndex(index)}
                                        className={`border rounded-xl p-3 transition-all cursor-pointer ${selectedFileIndex === index
                                            ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                                            : qf.status === "complete" ? "bg-green-500/10 border-green-500/30"
                                                : qf.status === "error" ? "bg-red-500/10 border-red-500/30"
                                                    : qf.status === "uploading" ? "bg-orange-500/10 border-orange-500/30"
                                                        : "bg-white/20 dark:bg-black/20 border-white/30 dark:border-white/10 hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${qf.status === "complete" ? "bg-green-500/20" :
                                                qf.status === "error" ? "bg-red-500/20" :
                                                    selectedFileIndex === index ? "bg-primary/20" : "bg-orange-500/20"
                                                }`}>
                                                {qf.status === "complete" ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                ) : qf.status === "uploading" ? (
                                                    <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                                                ) : (
                                                    <FileText className={`h-5 w-5 ${selectedFileIndex === index ? "text-primary" : "text-orange-500"}`} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium text-sm truncate ${selectedFileIndex === index ? "text-primary" : "text-gray-800 dark:text-white"}`}>
                                                    {qf.title || qf.file.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{formatFileSize(qf.file.size)}</span>
                                                    {qf.courseId && courses && (
                                                        <span className="text-orange-500">• {courses.find(c => c.id === qf.courseId)?.code}</span>
                                                    )}
                                                    {qf.semester && (
                                                        <span className="text-blue-500">• Sem {qf.semester}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {qf.status === "pending" && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeFileFromQueue(index); if (selectedFileIndex === index) setSelectedFileIndex(queuedFiles.length > 1 ? 0 : null); }}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 shrink-0"
                                                >
                                                    <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                </button>
                                            )}
                                        </div>
                                        {qf.status === "uploading" && (
                                            <div className="h-1 bg-white/20 dark:bg-black/20 rounded-full overflow-hidden mt-2">
                                                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${qf.progress}%` }} />
                                            </div>
                                        )}
                                        {qf.error && <p className="text-red-500 text-xs mt-2">{qf.error}</p>}
                                    </div>
                                ))}
                            </div>
                            {/* Add more files button */}
                            <div
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer ${dragActive ? "border-primary bg-primary/10" : "border-white/20 dark:border-white/10 hover:border-primary/50"}`}
                            >
                                <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <p className="text-gray-500 text-xs font-medium">+ Add more PDFs or drop folder</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Uploading {completedCount}/{queuedFiles.length} files...</span>
                            <span>{overallProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/20 dark:bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Visibility */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Visibility</label>
                    <div className="flex gap-2 p-1 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl">
                        {(["PUBLIC", "PRIVATE", "GROUP"] as const).map((v) => (
                            <button key={v} type="button" onClick={() => setVisibility(v)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${visibility === v ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-md border-2 border-primary" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 border-2 border-transparent"}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Group Selection */}
                {visibility === "GROUP" && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Groups</label>
                        <div className="max-h-32 overflow-y-auto p-2 bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 rounded-xl space-y-1">
                            {userGroups?.map((group: any) => (
                                <label key={group.id} className="flex items-center gap-2 p-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroupIds.includes(group.id)}
                                        onChange={(e) => { e.target.checked ? setSelectedGroupIds([...selectedGroupIds, group.id]) : setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id)); }}
                                        className="w-3.5 h-3.5 rounded text-orange-500"
                                    />
                                    <span className="text-sm text-gray-900 dark:text-white truncate">{group.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={uploading || queuedFiles.length === 0 || (visibility === "GROUP" && selectedGroupIds.length === 0)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--button-gradient-from)] via-[var(--button-gradient-via)] to-[var(--button-gradient-to)] text-white font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span>{uploading ? `Uploading ${completedCount}/${queuedFiles.length}...` : `Upload ${queuedFiles.length} Note${queuedFiles.length !== 1 ? "s" : ""}`}</span>
                </button>
            </form>
        </div>
    );
}
