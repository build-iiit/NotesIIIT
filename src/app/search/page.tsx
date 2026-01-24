"use client";

import { api } from "@/app/_trpc/client";
import { Loader2, Search as SearchIcon, FileText } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

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
    const debouncedSearch = useDebounceValue(search, 500);

    // Semester Options
    const semesters = [
        "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2"
    ];

    // Only query if search has content to avoid fetching all notes by default? 
    // Or maybe fetching all is fine. Let's fetch all if empty.
    const { data, isLoading } = api.notes.getAll.useQuery(
        { search: debouncedSearch, semester: semester || undefined, limit: 50 },
        { enabled: true } // Always enabled
    );

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <h1 className="text-4xl font-bold text-white mb-6">Find Notes</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-4xl">
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

                {/* Semester Filter */}
                <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="bg-black/40 border border-white/10 text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px] appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                >
                    <option value="">All Semesters</option>
                    {semesters.map(sem => (
                        <option key={sem} value={sem}>Sem {sem}</option>
                    ))}
                </select>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="flex justify-center mt-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {!data?.items.length ? (
                        <div className="text-center text-gray-500 mt-20">
                            {debouncedSearch ? `No notes found matching "${debouncedSearch}"` : "Try searching for something like 'Data Structures' or 'CS1.201'"}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {data.items.map((note) => (
                                <Link href={`/notes/${note.id}`} key={note.id} className="group">
                                    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col backdrop-blur-md relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            {note.course ? (
                                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10">
                                                    {note.course.code}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">General</span>
                                            )}
                                        </div>

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
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
