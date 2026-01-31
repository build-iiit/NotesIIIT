"use client";

import { use, useState, useRef, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import DeleteNoteButton from "@/components/DeleteNoteButton";
import { Folder, Tag, Plus } from "lucide-react";
import { Search, X, ChevronDown, CheckCircle } from "lucide-react";

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const [currentUser] = api.auth.getMe.useSuspenseQuery();
    const { data: folders } = api.folders.getAllFlat.useQuery(undefined, {
        enabled: !!currentUser,
    });
    const updateNote = api.notes.update.useMutation();
    const addVersion = api.versions.addVersion.useMutation();

    const { data: courses } = api.course.getAll.useQuery();
    const { data: tags, refetch: refetchTags } = api.tags.getAll.useQuery();
    const createTagMutation = api.tags.create.useMutation();

    const [title, setTitle] = useState(note?.title || "");
    const [description, setDescription] = useState(note?.description || "");

    // Course & Semester State
    const [selectedCourseId, setSelectedCourseId] = useState<string>(note?.courseId || "");
    const [selectedSemester, setSelectedSemester] = useState<string>(note?.semester || "");
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(note?.folderId || null);

    // Visibility State
    const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE" | "GROUP">(
        (note?.visibility as "PUBLIC" | "PRIVATE" | "GROUP") || "PUBLIC"
    );
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
        note?.sharedGroups?.map((g: { id: string }) => g.id) || []
    );

    // Tags State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>((note as any)?.tags?.map((t: { id: string }) => t.id) || []);
    const [customTagInput, setCustomTagInput] = useState("");
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    const [courseSearch, setCourseSearch] = useState(note?.course ? `${note.course.code} - ${note.course.name}` : note?.courseId ? `Course ${note.courseId}` : "");
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Fetch User Groups
    const { data: userGroups } = api.social.getGroups.useQuery();

    // Refs
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);

    // Click Outside Handler
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
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Authorization Check Logic helpers
    // We cannot return early here because it violates rules of hooks if hooks are below.
    const isAuthorized = currentUser && note && currentUser.id === note.authorId;

    if (!note) return <div>Note not found</div>;

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
                        <X className="h-12 w-12 text-red-500 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Unauthorized</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        You don&apos;t have permission to edit this note. Only the note owner can make changes.
                    </p>
                    <button
                        onClick={() => router.push(`/notes/${id}`)}
                        className="px-6 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                    >
                        Back to Note
                    </button>
                </div>
            </div>
        );
    }

    // Filter courses for search
    const filteredCourses = courses?.filter(course =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.code.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const semesters = [
        "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"
    ];

    const handleUpdateMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateNote.mutateAsync({
                id,
                title,
                description,
                courseId: selectedCourseId || undefined,
                semester: selectedSemester || undefined,
                folderId: selectedFolderId,
                visibility,
                groupIds: visibility === "GROUP" ? selectedGroupIds : undefined,
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            });
            router.push(`/notes/${id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update note");
        }
    };

    // Authorization check moved here or handled above (handled above)
    // We need to return the JSX now.

    // Generate Thumbnail Client-Side (Reused logic)
    const generateThumbnail = async (file: File): Promise<Blob | null> => {
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            const scale = 1.0;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) return null;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            } as any).promise;

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, "image/jpeg", 0.8);
            });
        } catch (error) {
            console.error("Client-side thumbnail generation failed:", error);
            return null;
        }
    };

    const handleNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // 1. Generate & Upload
            const formData = new FormData();
            formData.append("file", file);

            const thumbnailBlob = await generateThumbnail(file);
            if (thumbnailBlob) {
                formData.append("thumbnail", thumbnailBlob, "thumbnail.jpg");
            }

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

            // 2. Add Version
            await addVersion.mutateAsync({
                noteId: id,
                s3Key: s3Key,
                thumbnailKey: uploadResult.thumbnailKey,
            });

            alert("New version uploaded successfully!");
            // router.push(`/notes/${id}`); // Keep user on edit page
            router.refresh(); // Refresh data to show new version info if needed
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto pt-24">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Edit Note</h1>

            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Metadata</h2>
                <form onSubmit={handleUpdateMetadata} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Course Selector */}
                    <div className="relative" ref={courseDropdownRef}>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Course
                        </label>
                        <div className="relative">
                            <div className="flex items-center border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <Search className="h-5 w-5 text-gray-500 ml-3" />
                                <input
                                    type="text"
                                    value={courseSearch}
                                    onChange={(e) => {
                                        setCourseSearch(e.target.value);
                                        setSelectedCourseId("");
                                        setIsCourseDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCourseDropdownOpen(true)}
                                    placeholder="Search for a course..."
                                    className="w-full p-2 bg-transparent outline-none"
                                />
                                {courseSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCourseSearch("");
                                            setSelectedCourseId("");
                                        }}
                                        className="p-2 mr-1 hover:text-red-500 text-gray-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {isCourseDropdownOpen && (
                                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {!courses?.length ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">LOADING...</div>
                                    ) : filteredCourses?.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">No courses found</div>
                                    ) : (
                                        filteredCourses?.map((course: { id: string; code: string; name: string }) => (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setCourseSearch(`${course.code} - ${course.name}`);
                                                    setIsCourseDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                                            >
                                                <div className="font-semibold text-sm">{course.code}</div>
                                                <div className="text-xs text-gray-500 truncate">{course.name}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Semester Selector */}
                    <div className="relative" ref={semesterDropdownRef}>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Semester (Optional)
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                            className="w-full flex items-center justify-between p-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <span className={selectedSemester ? "text-gray-900 dark:text-gray-100" : "text-gray-500"}>
                                {selectedSemester ? `Semester ${selectedSemester}` : "Select a semester..."}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSemesterDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isSemesterDropdownOpen && (
                            <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1">
                                {semesters.map(sem => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSemester(sem);
                                            setIsSemesterDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center justify-between ${selectedSemester === sem ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <span>Semester {sem}</span>
                                        {selectedSemester === sem && <CheckCircle className="h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>


                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 h-32 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Folder Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Folder className="h-4 w-4 text-orange-500" />
                            Folder
                        </label>
                        <select
                            value={selectedFolderId || ""}
                            onChange={(e) => setSelectedFolderId(e.target.value || null)}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 text-gray-900 dark:text-white"
                        >
                            <option value="">📁 Root (No Folder)</option>
                            {folders?.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                    📂 {folder.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Move this note to a different folder
                        </p>
                    </div>

                    {/* Tags Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary" />
                            Tags
                        </label>

                        {/* Selected Tags Display */}
                        {selectedTagIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedTagIds.map(tagId => {
                                    const tag = tags?.find(t => t.id === tagId);
                                    return tag ? (
                                        <span
                                            key={tagId}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary dark:text-primary border border-primary/30 shadow-sm"
                                        >
                                            {tag.name}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tagId))}
                                                className="ml-0.5 hover:text-red-500 hover:scale-110 transition-all"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}

                        {/* Tag Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/10 hover:border-primary/50 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-gray-500">
                                    <Tag className="h-4 w-4" />
                                    {selectedTagIds.length > 0 ? `${selectedTagIds.length} tags selected` : "Select tags..."}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isTagDropdownOpen && (
                                <div className="absolute z-[100] w-full mt-2 backdrop-blur-3xl bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/10 max-h-72 overflow-y-auto">
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
                                                    onClick={() => {
                                                        if (selectedTagIds.includes(tag.id)) {
                                                            setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                                                        } else {
                                                            setSelectedTagIds(prev => [...prev, tag.id]);
                                                        }
                                                    }}
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
                                                        onClick={() => {
                                                            if (selectedTagIds.includes(tag.id)) {
                                                                setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                                                            } else {
                                                                setSelectedTagIds(prev => [...prev, tag.id]);
                                                            }
                                                        }}
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
                                                onKeyDown={async (e) => {
                                                    if (e.key === "Enter" && customTagInput.trim()) {
                                                        e.preventDefault();
                                                        try {
                                                            const newTag = await createTagMutation.mutateAsync({ name: customTagInput.trim() });
                                                            setSelectedTagIds(prev => [...prev, newTag.id]);
                                                            setCustomTagInput("");
                                                            refetchTags();
                                                        } catch (error) {
                                                            console.error("Failed to create tag:", error);
                                                        }
                                                    }
                                                }}
                                                placeholder="Type new tag..."
                                                className="flex-1 px-4 py-2.5 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/10 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (customTagInput.trim()) {
                                                        try {
                                                            const newTag = await createTagMutation.mutateAsync({ name: customTagInput.trim() });
                                                            setSelectedTagIds(prev => [...prev, newTag.id]);
                                                            setCustomTagInput("");
                                                            refetchTags();
                                                        } catch (error) {
                                                            console.error("Failed to create tag:", error);
                                                        }
                                                    }
                                                }}
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


                    {/* Visibility Selection */}

                    <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
                        <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Visibility</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {(["PUBLIC", "PRIVATE", "GROUP"] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setVisibility(type)}
                                    className={`p-4 rounded-xl border text-left transition-all ${visibility === type
                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20"
                                        : "border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    <div className="font-bold text-sm mb-1">{type}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {type === "PUBLIC" && "Visible to everyone"}
                                        {type === "PRIVATE" && "Only you"}
                                        {type === "GROUP" && "Specific groups"}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Group Selection (Only if GROUP visibility) */}
                    {visibility === "GROUP" && (
                        <div className="animate-in slide-in-from-top-2 fade-in">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Groups</label>
                            {userGroups?.length === 0 ? (
                                <div className="text-sm text-gray-500 italic p-4 border rounded bg-gray-50 dark:bg-zinc-800">
                                    You haven't joined any groups yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                    {userGroups?.map(group => (
                                        <div
                                            key={group.id}
                                            onClick={() => {
                                                if (selectedGroupIds.includes(group.id)) {
                                                    setSelectedGroupIds(prev => prev.filter(id => id !== group.id));
                                                } else {
                                                    setSelectedGroupIds(prev => [...prev, group.id]);
                                                }
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedGroupIds.includes(group.id)
                                                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500"
                                                : "hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGroupIds.includes(group.id)
                                                ? "bg-purple-500 border-purple-500 text-white"
                                                : "border-gray-400"
                                                }`}>
                                                {selectedGroupIds.includes(group.id) && <CheckCircle className="w-3 h-3" />}
                                            </div>
                                            <span className="text-sm font-medium">{group.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={updateNote.isPending}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:from-orange-600 hover:to-pink-600 transition-all font-medium"
                    >
                        {updateNote.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </section>

            <section className="border-t border-gray-200 dark:border-zinc-700 pt-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upload New Version</h2>
                <p className="text-gray-500 mb-4 text-sm">
                    Upload a new PDF to replace the current version. History will be preserved.
                </p>
                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center">
                    {uploading ? (
                        <div className="text-blue-500">Uploading...</div>
                    ) : (
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleNewVersion}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    )}
                </div>
            </section>

            <DeleteNoteButton noteId={id} />
        </div>
    );
}
