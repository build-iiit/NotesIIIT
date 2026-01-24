"use client";

import { use, useState, useRef, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import DeleteNoteButton from "@/components/DeleteNoteButton";
import { Folder, Search, X, ChevronDown, CheckCircle, FileText, Upload, Loader2 } from "lucide-react";

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // --- DATA FETCHING ---
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const [currentUser] = api.auth.getMe.useSuspenseQuery();
    const { data: folders } = api.folders.getAllFlat.useQuery(undefined, { enabled: !!currentUser });
    const { data: courses } = api.course.getAll.useQuery();
    
    const updateNote = api.notes.update.useMutation();
    const addVersion = api.versions.addVersion.useMutation();

    // --- STATE MANAGEMENT ---
    const [title, setTitle] = useState(note?.title || "");
    const [description, setDescription] = useState(note?.description || "");
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(note?.folderId || null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(note?.courseId || "");
    const [selectedSemester, setSelectedSemester] = useState<string>(note?.semester || "");
    
    const [courseSearch, setCourseSearch] = useState(
        note?.course ? `${note.course.code} - ${note.course.name}` : ""
    );
    
    const [uploading, setUploading] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);

    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---
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

    // --- HANDLERS ---
    const handleUpdateMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateNote.mutateAsync({
                id,
                title,
                description,
                folderId: selectedFolderId,
                courseId: selectedCourseId || undefined,
                semester: selectedSemester || undefined
            });
            router.push(`/notes/${id}`);
            router.refresh();
        } catch (error) {
            alert("Failed to update note metadata");
        }
    };

    const handleNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", file);

            // 1. Upload to local API
            const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error("Upload failed");

            const uploadResult = await uploadResponse.json();
            const s3Key = uploadResult.key;

            // 2. Add Version to Database
            await addVersion.mutateAsync({
                noteId: id,
                s3Key: s3Key,
            });

            alert("New version uploaded successfully!");
            router.push(`/notes/${id}`);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // --- AUTH CHECK ---
    const isAuthorized = currentUser && note && currentUser.id === note.authorId;
    if (!note) return <div className="p-8 text-center">Note not found</div>;
    if (!isAuthorized) return <UnauthorizedState router={router} id={id} />;

    const filteredCourses = courses?.filter(c =>
        c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(courseSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen py-12 px-4 relative overflow-hidden pt-24">
            {/* High Contrast Background Layers */}
            <div className="fixed inset-0 -z-20 bg-white dark:bg-black" />
            <div className="fixed top-0 left-0 right-0 h-[45vh] bg-gradient-to-b from-orange-300/30 via-rose-200/10 to-transparent dark:from-orange-700/20 dark:via-rose-600/10 dark:to-transparent -z-10" />
            <div className="fixed bottom-0 left-0 right-0 h-[45vh] bg-gradient-to-t from-purple-300/30 via-fuchsia-200/10 to-transparent dark:from-purple-800/20 dark:via-fuchsia-600/10 dark:to-transparent -z-10" />

            <div className="max-w-2xl mx-auto relative">
                {/* The Main Glass Card */}
                <div className="backdrop-blur-3xl bg-white/40 dark:bg-black/40 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)] border border-white/50 dark:border-white/10 p-8">
                    <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                        Edit Note
                    </h1>

                    <section className="space-y-8">
                        <form onSubmit={handleUpdateMetadata} className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Course Selector */}
                            <div className="relative" ref={courseDropdownRef}>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Course</label>
                                <div className="flex items-center px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                                    <input
                                        type="text"
                                        value={courseSearch}
                                        onChange={(e) => { setCourseSearch(e.target.value); setIsCourseDropdownOpen(true); }}
                                        onFocus={() => setIsCourseDropdownOpen(true)}
                                        className="bg-transparent outline-none w-full text-sm text-gray-900 dark:text-white"
                                    />
                                    {courseSearch && <X className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => {setCourseSearch(""); setSelectedCourseId("");}} />}
                                </div>
                                {isCourseDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl max-h-48 overflow-y-auto ring-1 ring-black/5">
                                        {filteredCourses?.map((c: any) => (
                                            <button key={c.id} type="button" onClick={() => { setSelectedCourseId(c.id); setCourseSearch(`${c.code} - ${c.name}`); setIsCourseDropdownOpen(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-orange-500/10 text-sm border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors">
                                                <span className="font-bold text-orange-600 dark:text-orange-400">{c.code}</span> — <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Semester Select */}
                                <div className="relative" ref={semesterDropdownRef}>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Semester</label>
                                    <button type="button" onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 flex justify-between items-center text-sm text-gray-900 dark:text-white">
                                        {selectedSemester ? `Sem ${selectedSemester}` : "Select Semester"}
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>
                                    {isSemesterDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/20 p-1 shadow-2xl ring-1 ring-black/5">
                                            {["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"].map(sem => (
                                                <button key={sem} type="button" onClick={() => { setSelectedSemester(sem); setIsSemesterDropdownOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedSemester === sem ? "bg-orange-500/20 text-orange-600 font-bold" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                                                    Semester {sem}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Folder Select */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Folder</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedFolderId || ""} 
                                            onChange={(e) => setSelectedFolderId(e.target.value || null)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 outline-none text-sm appearance-none cursor-pointer text-gray-900 dark:text-white"
                                        >
                                            <option value="">📁 Root (No Folder)</option>
                                            {folders?.map(f => <option key={f.id} value={f.id}>📂 {f.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/50 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all h-24 resize-none text-gray-900 dark:text-white"
                                    placeholder="Brief summary of the notes..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updateNote.isPending}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updateNote.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Changes"}
                            </button>
                        </form>

                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* New Version Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">File Versioning</h2>
                            <div className="relative border-2 border-dashed border-white/30 dark:border-white/10 rounded-2xl p-8 text-center bg-white/5 hover:bg-white/10 dark:hover:bg-white/5 transition-all group overflow-hidden">
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-3 text-orange-500">
                                        <Loader2 className="animate-spin h-10 w-10" />
                                        <span className="text-sm font-bold animate-pulse">Uploading and creating version...</span>
                                    </div>
                                ) : (
                                    <>
                                        <input type="file" accept=".pdf" onChange={handleNewVersion} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                        <div className="relative z-0">
                                            <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Click to upload a <span className="text-orange-500 font-bold">New PDF Version</span>
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">Previous versions will be archived in history</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <DeleteNoteButton noteId={id} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function UnauthorizedState({ router, id }: any) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="backdrop-blur-3xl bg-white/10 dark:bg-black/10 p-12 rounded-3xl border border-white/20 text-center shadow-2xl max-w-sm mx-4">
                <div className="bg-rose-500/20 p-4 rounded-full w-fit mx-auto mb-6">
                    <X className="h-10 w-10 text-rose-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2 dark:text-white">Unauthorized</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">You don't have permission to edit this note. Only the author can modify metadata or upload versions.</p>
                <button onClick={() => router.push(`/notes/${id}`)} className="w-full py-3 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 rounded-xl transition-all font-bold text-sm border border-gray-200 dark:border-white/10 shadow-sm">
                    Return to Note View
                </button>
            </div>
        </div>
    );
}
