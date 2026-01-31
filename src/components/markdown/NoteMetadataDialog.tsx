"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, CheckCircle, Loader2, Save } from "lucide-react";
import { api } from "@/app/_trpc/client";

interface NoteMetadataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (metadata: NoteMetadata) => Promise<void>;
    initialTitle: string;
    isSaving: boolean;
}

export interface NoteMetadata {
    title: string;
    description: string;
    courseId?: string;
    semester?: string;
    visibility: "PUBLIC" | "PRIVATE" | "GROUP";
    groupIds?: string[];
}

export function NoteMetadataDialog({ isOpen, onClose, onSave, initialTitle, isSaving }: NoteMetadataDialogProps) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState("");

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

    const { data: courses } = api.course.getAll.useQuery();
    const { data: userGroups } = api.social.getGroups.useQuery();

    const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"];

    useEffect(() => {
        if (isOpen) {
            setTitle(initialTitle);
        }
    }, [isOpen, initialTitle]);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) setIsCourseDropdownOpen(false);
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) setIsSemesterDropdownOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCourses = courses?.filter((course) =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.code.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            title,
            description,
            courseId: selectedCourseId || undefined,
            semester: selectedSemester || undefined,
            visibility,
            groupIds: visibility === "GROUP" ? selectedGroupIds : undefined,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                            Save Note
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white"
                                placeholder="Note Title"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white resize-none h-24"
                                placeholder="Brief description of what this note is about..."
                            />
                        </div>

                        {/* Course & Semester Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative" ref={courseDropdownRef}>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Course (Optional)</label>
                                <div className="flex items-center px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
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
                                {isCourseDropdownOpen && filteredCourses && filteredCourses.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-xl max-h-48 overflow-y-auto">
                                        {filteredCourses.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => { setSelectedCourseId(c.id); setCourseSearch(`${c.code} - ${c.name}`); setIsCourseDropdownOpen(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-zinc-800 text-sm border-b border-gray-100 dark:border-zinc-800 last:border-0"
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex justify-between items-center text-sm text-gray-900 dark:text-white"
                                >
                                    {selectedSemester ? `Sem ${selectedSemester}` : "Select"}
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </button>
                                {isSemesterDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 p-1 shadow-xl max-h-48 overflow-y-auto">
                                        {semesters.map(sem => (
                                            <button
                                                key={sem}
                                                type="button"
                                                onClick={() => { setSelectedSemester(sem); setIsSemesterDropdownOpen(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedSemester === sem ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-bold" : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"}`}
                                            >
                                                Semester {sem}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Visibility</label>
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                                {(["PUBLIC", "PRIVATE", "GROUP"] as const).map((v) => (
                                    <button key={v} type="button" onClick={() => setVisibility(v)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${visibility === v ? "bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Group Selection */}
                        {visibility === "GROUP" && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">Groups</label>
                                <div className="max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl space-y-1">
                                    {userGroups?.map((group: any) => (
                                        <label key={group.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupIds.includes(group.id)}
                                                onChange={(e) => { e.target.checked ? setSelectedGroupIds([...selectedGroupIds, group.id]) : setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id)); }}
                                                className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500"
                                            />
                                            <span className="text-sm text-gray-900 dark:text-white truncate">{group.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !title || (visibility === "GROUP" && selectedGroupIds.length === 0)}
                                className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                <span>Save Note</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
