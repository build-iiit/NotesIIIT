"use client";

import { use, useState, useRef, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import DeleteNoteButton from "@/components/DeleteNoteButton";
import { Search, X, ChevronDown, CheckCircle } from "lucide-react";

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const [currentUser] = api.auth.getMe.useSuspenseQuery();
    const updateNote = api.notes.update.useMutation();
    const addVersion = api.versions.addVersion.useMutation();

    const { data: courses } = api.course.getAll.useQuery();

    const [title, setTitle] = useState(note?.title || "");
    const [description, setDescription] = useState(note?.description || "");

    // Course & Semester State
    const [selectedCourseId, setSelectedCourseId] = useState<string>(note?.courseId || "");
    const [selectedSemester, setSelectedSemester] = useState<string>(note?.semester || "");
    const [courseSearch, setCourseSearch] = useState(note?.course ? `${note.course.code} - ${note.course.name}` : note?.courseId ? `Course ${note.courseId}` : "");
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

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
                semester: selectedSemester || undefined
            });
            router.push(`/notes/${id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update note");
        }
    };

    // Authorization check moved here or handled above (handled above)
    // We need to return the JSX now.

    const handleNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // 1. Upload Locally (Bypass S3)
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

            // 2. Add Version
            await addVersion.mutateAsync({
                noteId: id,
                s3Key: s3Key,
            });

            alert("New version uploaded!");
            router.push(`/notes/${id}`);
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Edit Note</h1>

            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Metadata</h2>
                <form onSubmit={handleUpdateMetadata} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                            className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={updateNote.isPending}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        {updateNote.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </section>

            <section className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-4">Upload New Version</h2>
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
