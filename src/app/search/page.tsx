"use client";

import { api } from "@/app/_trpc/client";
import { Loader2, Search as SearchIcon, FileText, CheckCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// Inline Debounce Hook for simplicity if missing
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function SearchPage() {
    const [search, setSearch] = useState("");
    const [semester, setSemester] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "popular">("popular"); // Default to Trending

    // Dropdown States
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

    // Refs
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    const debouncedSearch = useDebounceValue(search, 500);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Semester Options
    const semesters = [
        "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"
    ];

    // Use Infinite Query
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = api.notes.getInfinite.useInfiniteQuery(
        { search: debouncedSearch, semester: semester || undefined, sortBy: sortBy, limit: 10 },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

    const allNotes = data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <h1 className="text-4xl font-bold text-white mb-6">Find Notes</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-5xl">
                {/* Search Input */}
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by course code, name, or author..."
                        className="w-full bg-black/40 border border-white/10 text-white placeholder-gray-500 pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 shadow-lg"
                        autoFocus
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="relative min-w-[160px]" ref={sortDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className="w-full flex items-center justify-between bg-black/40 border border-white/10 text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:bg-white/5"
                    >
                        <span className="text-white font-medium">
                            {sortBy === "popular" ? "Trending" : "Recent"}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isSortDropdownOpen && (
                        <div className="absolute z-[100] w-full mt-2 bg-black/95 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl ring-1 ring-white/10 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy("popular");
                                    setIsSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${sortBy === "popular"
                                    ? "bg-primary/20 text-primary border border-primary/20"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <span className="font-medium">Trending</span>
                                {sortBy === "popular" && <CheckCircle className="h-4 w-4 text-primary" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortBy("newest");
                                    setIsSortDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${sortBy === "newest"
                                    ? "bg-primary/20 text-primary border border-primary/20"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <span className="font-medium">Recent</span>
                                {sortBy === "newest" && <CheckCircle className="h-4 w-4 text-primary" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Semester Custom Dropdown */}
                <div className="relative min-w-[200px]" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between bg-black/40 border border-white/10 text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:bg-white/5"
                    >
                        <span className={semester ? "text-white" : "text-gray-400"}>
                            {semester ? `Sem ${semester}` : "All Semesters"}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute z-[100] w-full mt-2 bg-black/95 border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto backdrop-blur-xl ring-1 ring-white/10 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSemester("");
                                    setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${semester === ""
                                    ? "bg-primary/20 text-primary border border-primary/20"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <span className="font-medium">All Semesters</span>
                                {semester === "" && <CheckCircle className="h-4 w-4 text-primary" />}
                            </button>
                            {semesters.map(sem => (
                                <button
                                    key={sem}
                                    type="button"
                                    onClick={() => {
                                        setSemester(sem);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${semester === sem
                                        ? "bg-primary/20 text-primary border border-primary/20"
                                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <span className="font-medium">Sem {sem}</span>
                                    {semester === sem && <CheckCircle className="h-4 w-4 text-primary" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="flex justify-center mt-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {!allNotes.length ? (
                        <div className="text-center text-gray-500 mt-20">
                            {debouncedSearch ? `No notes found matching "${debouncedSearch}"` : "Try searching for something like 'Data Structures' or 'CS1.201'"}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {allNotes.map((note) => (
                                    <Link href={`/notes/${note.id}`} key={note.id} className="group">
                                        <div className="bg-card border border-border rounded-xl hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col backdrop-blur-md relative overflow-hidden">

                                            {/* Thumbnail Section */}
                                            <div className="relative h-40 w-full bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800">
                                                {note.versions[0]?.thumbnailKey ? (
                                                    <img
                                                        src={note.versions[0].thumbnailKey}
                                                        alt={`Thumbnail for ${note.title}`}
                                                        className="w-full h-full object-cover object-top"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400">
                                                        <FileText className="h-12 w-12" />
                                                    </div>
                                                )}
                                                {/* Course Badge */}
                                                {note.course && (
                                                    <span className="absolute top-2 right-2 text-xs font-mono text-white bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                                                        {note.course.code}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-5 flex flex-col flex-grow">
                                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                    {note.title}
                                                </h3>

                                                {note.course && (
                                                    <p className="text-xs text-gray-400 mb-2 truncate">
                                                        {note.course.name}
                                                    </p>
                                                )}

                                                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">
                                                    {note.description || "No description provided."}
                                                </p>

                                                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5 mt-auto">
                                                    <span className="flex items-center gap-1">
                                                        By {note.author?.name || "Unknown"}
                                                    </span>
                                                    <span>
                                                        {new Date(note.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {hasNextPage && (
                                <div className="flex justify-center pt-8">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-6 py-2 rounded-full font-medium bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isFetchingNextPage ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            "Load More"
                                        )}
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
