"use client";

import { api } from "@/app/_trpc/client";
import { Loader2, Search as SearchIcon, FileText, CheckCircle, ChevronDown, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Inline Debounce Hook
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

type CachedCourse = { id: string; name: string; code: string };
type CachedNote = { id: string; title: string };

export default function SearchPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [semester, setSemester] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "popular">("popular");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Dropdown States
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

    // Refs
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const debouncedSearch = useDebounceValue(search, 300);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const semesters = [
        "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"
    ];

    // Data Fetching
    const { data: notesData, isLoading: isLoadingNotes } = api.notes.getAll.useQuery(
        { cursor: undefined, limit: 100 }
    );
    const { data: coursesData } = api.course.getAll.useQuery();

    // Suggestions Logic
    const [suggestions, setSuggestions] = useState<{ type: 'course' | 'note', id: string, label: string, subLabel?: string }[]>([]);

    useEffect(() => {
        if (!debouncedSearch) {
            setSuggestions([]);
            return;
        }

        const searchLower = debouncedSearch.toLowerCase();
        const results: typeof suggestions = [];

        // Match Courses
        if (coursesData) {
            const matchedCourses = coursesData
                .filter(c => c.name.toLowerCase().includes(searchLower) || c.code.toLowerCase().includes(searchLower))
                .slice(0, 3)
                .map(c => ({
                    type: 'course' as const,
                    id: c.id,
                    label: `${c.code} - ${c.name}`,
                    subLabel: 'Course'
                }));
            results.push(...matchedCourses);
        }

        // Match Notes
        if (notesData?.items) {
            const matchedNotes = notesData.items
                .filter(n => n.title.toLowerCase().includes(searchLower))
                .slice(0, 5)
                .map(n => ({
                    type: 'note' as const,
                    id: n.id,
                    label: n.title,
                    subLabel: n.course ? `${n.course.code}` : 'General Note'
                }));
            results.push(...matchedNotes);
        }

        setSuggestions(results);
        setShowSuggestions(results.length > 0);
    }, [debouncedSearch, coursesData, notesData]);


    // Filtering
    const filteredNotes = (notesData?.items || []).filter((note: any) => {
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch =
                note.title.toLowerCase().includes(searchLower) ||
                note.description?.toLowerCase().includes(searchLower) ||
                note.course?.code.toLowerCase().includes(searchLower) ||
                note.course?.name.toLowerCase().includes(searchLower) ||
                note.author?.name?.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        if (semester && note.semester !== semester) {
            return false;
        }

        return true;
    });

    const sortedNotes = [...filteredNotes].sort((a: any, b: any) => {
        if (sortBy === "popular") {
            return (b.voteScore || 0) - (a.voteScore || 0);
        } else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen pt-24">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Find Notes</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-5xl relative z-20">
                {/* Search Input with Autocomplete */}
                <div className="relative flex-grow" ref={searchRef}>
                    <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        placeholder="Search by course code, name, or author..."
                        className="w-full bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-lg backdrop-blur-xl"
                        autoFocus
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                            {suggestions.map((item) => (
                                <button
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => {
                                        if (item.type === 'course') {
                                            setSearch(item.label.split(' - ')[0]); // Set search to course code
                                            // Ideally navigate to a course page, but search filter works too
                                            setShowSuggestions(false);
                                        } else {
                                            router.push(`/notes/${item.id}`);
                                        }
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                                >
                                    {item.type === 'course' ? (
                                        <BookOpen className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                    ) : (
                                        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {item.label}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {item.subLabel}
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-400 transform -rotate-45">
                                        ➤
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative min-w-[160px]" ref={sortDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className="w-full flex items-center justify-between bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 backdrop-blur-xl shadow-lg"
                    >
                        <span className="font-medium">
                            {sortBy === "popular" ? "Trending" : "Recent"}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isSortDropdownOpen && (
                        <div className="absolute z-[40] w-full mt-2 bg-white/95 dark:bg-black/95 border border-gray-200 dark:border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl p-1">
                            <button
                                type="button"
                                onClick={() => { setSortBy("popular"); setIsSortDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${sortBy === "popular"
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                            >
                                <span>Trending</span>
                                {sortBy === "popular" && <CheckCircle className="h-4 w-4 text-orange-500" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSortBy("newest"); setIsSortDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${sortBy === "newest"
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                            >
                                <span>Recent</span>
                                {sortBy === "newest" && <CheckCircle className="h-4 w-4 text-orange-500" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Semester Custom Dropdown */}
                <div className="relative min-w-[200px]" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 backdrop-blur-xl shadow-lg"
                    >
                        <span className={semester ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                            {semester ? `Sem ${semester}` : "All Semesters"}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute z-[40] w-full mt-2 bg-white/95 dark:bg-black/95 border border-gray-200 dark:border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto backdrop-blur-xl p-1">
                            <button
                                type="button"
                                onClick={() => { setSemester(""); setIsDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${semester === ""
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                            >
                                <span>All Semesters</span>
                                {semester === "" && <CheckCircle className="h-4 w-4 text-orange-500" />}
                            </button>
                            {semesters.map(sem => (
                                <button
                                    key={sem}
                                    type="button"
                                    onClick={() => { setSemester(sem); setIsDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${semester === sem
                                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                        }`}
                                >
                                    <span>Sem {sem}</span>
                                    {semester === sem && <CheckCircle className="h-4 w-4 text-orange-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            {isLoadingNotes ? (
                <div className="flex justify-center mt-20">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                </div>
            ) : (
                <>
                    {!sortedNotes.length ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-20 p-10 glass-card rounded-3xl max-w-2xl mx-auto">
                            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">No results found</h3>
                            <p>
                                {debouncedSearch ? `No notes found matching "${debouncedSearch}"` : "Try searching for something like 'Data Structures' or 'CS1.201'"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedNotes.map((note: any) => (
                                <Link href={`/notes/${note.id}`} key={note.id} className="group">
                                    <div className="glass-card rounded-2xl p-5 hover:border-orange-500/40 hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col relative overflow-hidden bg-white/40 dark:bg-black/40">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="bg-orange-500/10 p-2 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                                                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                                            </div>
                                            {note.course ? (
                                                <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-black/5 dark:border-white/10">
                                                    {note.course.code}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-black/5 dark:border-white/10">General</span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                                            {note.title}
                                        </h3>

                                        {note.course && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate flex items-center gap-1">
                                                <BookOpen className="h-3 w-3" />
                                                {note.course.name}
                                            </p>
                                        )}

                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-grow">
                                            {note.description || "No description provided."}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-white/10 mt-auto">
                                            <span className="flex items-center gap-1 font-medium">
                                                By {note.author?.name || "Unknown"}
                                            </span>
                                            <span>
                                                {new Date(note.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
