"use client";

import { api } from "@/app/_trpc/client";
import { Loader2, Search as SearchIcon, FileText, CheckCircle, ChevronDown, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"];

    // 1 & 2. NEW-FEATURES: Infinite Query with Server-side Search/Filter
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = api.notes.getInfinite.useInfiniteQuery(
        {
            search: debouncedSearch,
            semester: semester || undefined,
            sortBy: sortBy,
            limit: 12
        },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

    const { data: coursesData } = api.course.getAll.useQuery();

    // Flatten all pages of notes into one array
    const allNotes = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

    // Suggestions Logic
    const suggestions = useMemo(() => {
        if (!debouncedSearch) return [];
        const searchLower = debouncedSearch.toLowerCase();
        const results: { type: 'course' | 'note', id: string, label: string, subLabel?: string }[] = [];

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

        const matchedNotes = allNotes
            .filter(n => n.title.toLowerCase().includes(searchLower))
            .slice(0, 5)
            .map(n => ({
                type: 'note' as const,
                id: n.id,
                label: n.title,
                subLabel: n.course ? `${n.course.code}` : 'General Note'
            }));
        results.push(...matchedNotes);

        return results;
    }, [debouncedSearch, coursesData, allNotes]);

    useEffect(() => {
        if (suggestions.length > 0 && document.activeElement === searchRef.current?.querySelector('input')) {
            setShowSuggestions(true);
        }
    }, [suggestions]);

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen pt-24">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">&nbsp;&nbsp;&nbsp;Find Notes</h1>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-5xl relative z-20">
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
                        className="w-full bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200 shadow-lg backdrop-blur-xl"
                        autoFocus
                    />

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                            {suggestions.map((item) => (
                                <button
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => {
                                        if (item.type === 'course') {
                                            setSearch(item.label.split(' - ')[0]);
                                            setShowSuggestions(false);
                                        } else {
                                            router.push(`/notes/${item.id}`);
                                        }
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                                >
                                    {item.type === 'course' ? <BookOpen className="h-5 w-5 text-orange-500" /> : <FileText className="h-5 w-5 text-blue-500" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subLabel}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort Toggle */}
                <div className="relative min-w-[160px]" ref={sortDropdownRef}>
                    <button
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className="w-full flex items-center justify-between bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-6 py-4 rounded-xl shadow-lg"
                    >
                        <span className="font-medium">{sortBy === "popular" ? "Trending" : "Recent"}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isSortDropdownOpen && (
                        <div className="absolute z-[40] w-full mt-2 bg-white/95 dark:bg-black/95 border border-gray-200 rounded-xl shadow-2xl p-1">
                            {["popular", "newest"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => { setSortBy(type as any); setIsSortDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between ${sortBy === type ? "bg-orange-500/10 text-orange-600 font-bold" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100"}`}
                                >
                                    <span>{type === "popular" ? "Trending" : "Recent"}</span>
                                    {sortBy === type && <CheckCircle className="h-4 w-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Semester Filter */}
                <div className="relative min-w-[200px]" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-6 py-4 rounded-xl shadow-lg"
                    >
                        <span>{semester ? `Sem ${semester}` : "All Semesters"}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute z-[40] w-full mt-2 bg-white/95 dark:bg-black/95 border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1">
                            <button onClick={() => { setSemester(""); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">All Semesters</button>
                            {semesters.map(sem => (
                                <button key={sem} onClick={() => { setSemester(sem); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">Sem {sem}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Section */}
            {isLoading ? (
                <div className="flex justify-center mt-20">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                </div>
            ) : (
                <>
                    {/* 4. MAIN: Styled Empty State Alert */}
                    {!allNotes.length ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-20 p-10 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl max-w-2xl mx-auto shadow-xl">
                            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No results found</h3>
                            <p>
                                {debouncedSearch ? `No notes found matching "${debouncedSearch}"` : "Try searching for something like 'Data Structures' or 'CS1.201'"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* 3. NEW-FEATURES: Grid with Thumbnails */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {allNotes.map((note) => (
                                    <Link href={`/notes/${note.id}`} key={note.id} className="group">
                                        <div className="bg-white/40 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col backdrop-blur-md overflow-hidden">

                                            {/* Thumbnail */}
                                            <div className="relative h-40 w-full bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800 overflow-hidden">
                                                {(note as any).thumbnailUrl || (note as any).versions?.[0]?.thumbnailKey ? (
                                                    <img
                                                        src={(note as any).thumbnailUrl || (note as any).versions?.[0]?.thumbnailKey}
                                                        alt={note.title}
                                                        className="w-full h-full object-cover object-top"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400">
                                                        <FileText className="h-12 w-12" />
                                                    </div>
                                                )}
                                                {note.course && (
                                                    <span className="absolute top-2 right-2 text-xs font-mono text-white bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                                                        {note.course.code}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-5 flex flex-col flex-grow">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                                                    {note.title}
                                                </h3>
                                                {note.course && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" /> {note.course.name}
                                                    </p>
                                                )}
                                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-grow">
                                                    {note.description || "No description provided."}
                                                </p>
                                                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-white/10 mt-auto">
                                                    <span className="font-medium">By {note.author?.name || "Unknown"}</span>
                                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Load More Button */}
                            {hasNextPage && (
                                <div className="flex justify-center pt-8">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-8 py-3 rounded-full font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isFetchingNextPage ? <Loader2 className="h-5 w-5 animate-spin" /> : "Show More Notes"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}