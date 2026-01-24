"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

export function NotesFeed() {
    const [sort, setSort] = useState<"newest" | "popular">("popular");
    const [displayCount, setDisplayCount] = useState(10);

    // Regular query instead of infinite query
    const { data, isLoading } = api.notes.getAll.useQuery({
        cursor: undefined,
        limit: 100 // Load more at once
    });

    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && data?.items && displayCount < data.items.length) {
            setDisplayCount(prev => prev + 10);
        }
    }, [inView, data?.items, displayCount]);

    // Client-side sorting
    const sortedNotes = (data?.items || []).sort((a: { voteScore?: number; createdAt: Date | string }, b: { voteScore?: number; createdAt: Date | string }) => {
        if (sort === "popular") {
            return (b.voteScore || 0) - (a.voteScore || 0);
        } else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    // Display subset
    const allNotes = sortedNotes.slice(0, displayCount);

    if (isLoading) {
        return <div className="text-center py-10">Loading notes...</div>;
    }

    if (sortedNotes.length === 0 && !isLoading) {
        return (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <p className="text-gray-500 mb-4">No notes shared yet.</p>
                <Link href="/upload" className="text-blue-600 hover:underline">
                    Be the first to upload!
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">
                        {sort === "popular" ? "Trending Notes" : "Recent Uploads"}
                    </h2>
                    <div className="flex bg-black/20 p-1.5 rounded-lg">
                        <button
                            onClick={() => setSort("popular")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${sort === "popular" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"}`}
                        >
                            Trending
                        </button>
                        <button
                            onClick={() => setSort("newest")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${sort === "newest" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"}`}
                        >
                            Recent
                        </button>
                    </div>
                </div>
                <Link
                    href="/upload"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95]"
                >
                    Upload Note
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allNotes.map((note) => (
                    <Link
                        key={note.id}
                        href={`/notes/${note.id}`}
                        className="group block backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border border-white/20 hover:border-orange-300/30 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.2)] transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="p-5 h-full flex flex-col">
                            <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {note.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                <span>By {(note as { author?: { name?: string } }).author?.name || "Unknown"}</span>
                                <span>•</span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </p>
                            {note.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                                    {note.description}
                                </p>
                            )}
                            <div className="mt-auto flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <span className="flex items-center gap-1">
                                    View details &rarr;
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {displayCount < sortedNotes.length && (
                <div className="text-center py-4 text-gray-500">Loading more...</div>
            )}

            <div ref={ref} className="h-4" />
        </div>
    );
}
