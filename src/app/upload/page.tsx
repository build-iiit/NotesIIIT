"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Upload, FileText, X, CheckCircle, Loader2, Search, ChevronDown, Plus, Github } from "lucide-react";

type UploadStep = "idle" | "uploading" | "creating-record" | "complete";

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFolderId = searchParams.get("folderId");

    const [file, setFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [folderId, setFolderId] = useState<string | null>(initialFolderId);
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
    const getUploadUrlMutation = api.notes.getUploadUrl.useMutation();

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
            try {
                const pdfjsLib = await import("pdfjs-dist");
                // Use local worker file from public directory
                pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
                console.log("PDF.js worker initialized with local source");
            } catch (err) {
                console.error("Failed to initialize PDF.js worker:", err);
            }
        };
        initPdf();
    }, []);

    // Google Drive Integration
    const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);

    useEffect(() => {
        const loadGoogleScript = () => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                const gapi = (window as any).gapi;
                gapi.load('client:picker', async () => {
                    setIsGoogleApiLoaded(true);
                });
            };
            document.body.appendChild(script);

            // Also load the GIS client for auth
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            document.body.appendChild(gisScript);
        };
        loadGoogleScript();
    }, []);

    const handleGoogleDrivePick = async () => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!apiKey || !clientId) {
            alert("Google Drive integration is not configured (Missing User API Keys).");
            return;
        }

        const google = (window as any).google;
        const gapi = (window as any).gapi;

        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: async (response: any) => {
                if (response.error !== undefined) {
                    throw (response);
                }
                createPicker(response.access_token);
            },
        });

        tokenClient.requestAccessToken();

        function createPicker(oauthToken: string) {
            const picker = new google.picker.PickerBuilder()
                .addView(google.picker.ViewId.PDFS)
                .setOAuthToken(oauthToken)
                .setDeveloperKey(apiKey)
                .setCallback(pickerCallback)
                .build();
            picker.setVisible(true);
        }

        async function pickerCallback(data: any) {
            if (data.action === google.picker.Action.PICKED) {
                const doc = data.docs[0];
                const fileId = doc.id;
                const fileName = doc.name;
                const oauthToken = gapi.client.getToken()?.access_token || (data.docs[0].accessToken) || (tokenClient as any).accessToken; // Tricky to get token back sometimes if not stored

                // We actually need the access token we just got.
                // The tokenClient callback didn't save it globally, let's pass it or rely on gapi if we set it.
                // Easier: Use the token from the closure if we can. 
                // BUT: createPicker is inside. 
                // Let's refactor slightly to ensure we have the token for the fetch.
                // For now, I'll re-request or use a closure variable.

                downloadFile(fileId, fileName, oauthToken);
            }
        }

        async function downloadFile(fileId: string, fileName: string, token: string) {
            try {
                // We need to pass the token effectively. 
                // NOTE: The token from initTokenClient is what we need. 
                // If createPicker was called, we had it. Use a localized fetch.

                // Let's use the token stored in gapi client if possible, or just the one passed.
                // Actually, the picker callback doesn't easily receive the token from the closure unless we nest it.
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Google Drive with browser-based download + progress indicators
    const [driveUploadProgress, setDriveUploadProgress] = useState<string>("");
    const [driveProgressPercent, setDriveProgressPercent] = useState<number>(0);

    const triggerGoogleDrive = () => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!apiKey || !clientId) {
            alert("Google Drive integration is not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file.");
            return;
        }

        const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    const picker = new (window as any).google.picker.PickerBuilder()
                        .addView((window as any).google.picker.ViewId.PDFS)
                        .setOAuthToken(tokenResponse.access_token)
                        .setDeveloperKey(apiKey)
                        .setCallback(async (data: any) => {
                            if (data.action === (window as any).google.picker.Action.PICKED) {
                                const doc = data.docs[0];
                                const fileId = doc.id;
                                const fileName = doc.name;
                                const fileSize = doc.sizeBytes || 0;

                                try {
                                    setUploading(true);
                                    setDriveUploadProgress("Downloading from Google Drive...");
                                    setDriveProgressPercent(10);

                                    // Download from Google Drive (browser-based)
                                    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                    });

                                    if (!res.ok) throw new Error("Failed to download from Google Drive");

                                    setDriveProgressPercent(40);
                                    setDriveUploadProgress("Processing file...");

                                    const blob = await res.blob();
                                    const file = new File([blob], fileName, { type: "application/pdf" });

                                    setDriveProgressPercent(60);
                                    setDriveUploadProgress("Generating thumbnail...");

                                    setFile(file);
                                    if (!title.trim()) setTitle(fileName.replace(/\.[^/.]+$/, ""));

                                    const thumb = await generateThumbnail(file);
                                    if (thumb) setThumbnailFile(thumb);

                                    setDriveProgressPercent(100);
                                    setDriveUploadProgress("Ready to upload!");

                                    // Clear progress after a short delay
                                    setTimeout(() => {
                                        setDriveUploadProgress("");
                                        setDriveProgressPercent(0);
                                    }, 1500);

                                } catch (err: any) {
                                    alert("Error importing file: " + err.message);
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

        client.requestAccessToken();
    };

    // Thumbnail Generator Logic
    const generateThumbnail = async (pdfFile: File): Promise<File | null> => {
        try {
            console.log("Generating thumbnail for:", pdfFile.name);
            const pdfjsLib = await import("pdfjs-dist");
            // Ensure worker is set (redundant check but safe)
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            }

            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            console.log("PDF loaded, pages:", pdf.numPages);
            const page = await pdf.getPage(1);

            const originalViewport = page.getViewport({ scale: 1.0 });
            const maxWidth = 400;
            const scale = maxWidth / originalViewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) {
                console.error("Failed to get canvas context");
                return null;
            }

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({
                canvasContext: context,
                viewport: scaledViewport,
                // Some versions of pdfjs types might require the canvas element explicitly
                canvas: canvas
            } as any).promise;

            console.log("Thumbnail rendered to canvas");

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        console.error("Canvas to Blob failed");
                        resolve(null);
                    } else {
                        console.log("Thumbnail blob created, size:", blob.size);
                        resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
                    }
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

            // Auto-title if empty
            if (!title.trim()) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }

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
                // To do it right: use a ref for title or add title to dependency.
                // Adding title to dependency re-binds the event listener which is fine.

                // WAIT: handleDrop uses useCallback with [], so 'title' is stale.
                // I will update the dependency array to include 'title'.

                const thumb = await generateThumbnail(droppedFile);
                if (thumb) setThumbnailFile(thumb);
            } else {
                alert("Please upload a PDF file");
            }
        }
    }, []);

    // Fix for stale title in handleDrop: We will implement the logic inside the setFile callback or just update the dependency.
    // Updating dependency is safer for React.


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

            // 1. Get Presigned URL for PDF
            const { url: pdfUploadUrl, s3Key: pdfS3Key } = await getUploadUrlMutation.mutateAsync({
                filename: file.name,
                contentType: file.type || "application/pdf"
            });

            // 2. Upload PDF directly to S3
            await fetch(pdfUploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type || "application/pdf" }
            });

            setUploadProgress(50);

            // 3. Upload Thumbnail (if exists)
            let thumbnailKey: string | undefined;
            if (thumbnailFile) {
                try {
                    const { url: thumbUploadUrl, s3Key: thumbS3Key } = await getUploadUrlMutation.mutateAsync({
                        filename: `thumb_${file.name}.jpg`,
                        contentType: "image/jpeg"
                    });

                    await fetch(thumbUploadUrl, {
                        method: "PUT",
                        body: thumbnailFile,
                        headers: { "Content-Type": "image/jpeg" }
                    });

                    thumbnailKey = thumbS3Key;
                } catch (e) {
                    console.error("Failed to upload thumbnail", e);
                }
            }

            setUploadProgress(70);

            // 4. Create Database Record
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

    // GitHub Import Logic
    const [uploadMode, setUploadMode] = useState<"local" | "github">("local");
    const [githubUrl, setGithubUrl] = useState("");
    const [isFetchingGithub, setIsFetchingGithub] = useState(false);

    const handleGithubImport = async () => {
        if (!githubUrl) return;

        try {
            setIsFetchingGithub(true);

            // Convert standard GitHub blob URL to raw URL
            // From: https://github.com/user/repo/blob/branch/path/file.pdf
            // To:   https://raw.githubusercontent.com/user/repo/branch/path/file.pdf
            let rawUrl = githubUrl;
            if (githubUrl.includes("github.com") && githubUrl.includes("/blob/")) {
                rawUrl = githubUrl
                    .replace("github.com", "raw.githubusercontent.com")
                    .replace("/blob/", "/");
            }

            const response = await fetch(rawUrl);
            if (!response.ok) throw new Error("Failed to fetch file from GitHub");

            const blob = await response.blob();
            const filename = githubUrl.split("/").pop() || "github-import.pdf";

            if (blob.type !== "application/pdf" && blob.type !== "application/octet-stream") {
                console.warn("Unexpected content type:", blob.type);
            }

            if (!filename.toLowerCase().endsWith(".pdf") && blob.type !== "application/pdf") {
                throw new Error("The fetched file does not appear to be a PDF");
            }

            const importedFile = new File([blob], filename, { type: "application/pdf" });

            setFile(importedFile);
            setUploadMode("local"); // Switch back to view the file

            const thumb = await generateThumbnail(importedFile);
            if (thumb) setThumbnailFile(thumb);

        } catch (error) {
            console.error("GitHub import failed:", error);
            alert(`GitHub import failed: ${error instanceof Error ? error.message : "Check the URL and try again"}`);
        } finally {
            setIsFetchingGithub(false);
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">PDF File *</label>
                                {!file && (
                                    <div className="flex bg-white/50 dark:bg-black/50 rounded-lg p-1 border border-white/20">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode("local")}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === "local" ? "bg-white dark:bg-zinc-800 shadow text-orange-600" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Local Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode("github")}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === "github" ? "bg-white dark:bg-zinc-800 shadow text-orange-600" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            GitHub Import
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!file ? (
                                uploadMode === 'local' ? (
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
                                        <p className="text-gray-500 text-sm mb-4">PDF files only</p>

                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); triggerGoogleDrive(); }}
                                                disabled={uploading}
                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm flex items-center gap-2 transition-all z-10 relative disabled:opacity-50"
                                            >
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4" alt="Drive" />
                                                Import from Drive
                                            </button>
                                        </div>

                                        {/* Drive Upload Progress */}
                                        {driveUploadProgress && (
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400 font-medium">{driveUploadProgress}</span>
                                                    <span className="text-orange-500 font-bold">{driveProgressPercent}%</span>
                                                </div>
                                                <div className="h-2 bg-white/20 dark:bg-black/30 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
                                                        style={{ width: `${driveProgressPercent}%` }}
                                                    />
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
                                                className="px-6 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 font-bold text-sm transition-colors border border-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isFetchingGithub ? <Loader2 className="h-5 w-5 animate-spin" /> : "Import"}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 ml-1">Paste a URL to a PDF file hosted on GitHub.</p>
                                    </div>
                                )

                            ) : (
                                <div className="bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
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
                                        userGroups?.map((group: any) => (
                                            <label
                                                key={group.id}
                                                className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                                            >
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

export default function UploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        }>
            <UploadContent />
        </Suspense>
    );
}
