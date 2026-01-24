"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

export function NotesFeed() {
    const [sort, setSort] = useState<"newest" | "popular">("popular");

    // Infinite query for pagination
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = api.notes.getInfinite.useInfiniteQuery(
        { limit: 10, sortBy: sort },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    if (isLoading) {
        return <div className="text-center py-10">Loading notes...</div>;
    }

    const allNotes = data?.pages.flatMap((page) => page.items) ?? [];

    if (allNotes.length === 0 && !isLoading) {
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
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    Upload Note
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allNotes.map((note) => (
                    <Link
                        key={note.id}
                        href={`/notes/${note.id}`}
                        className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-blue-500/50"
                    >
                        <div className="relative h-48 w-full bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800">
                            {note.versions[0]?.thumbnailKey ? (
                                <img
                                    src={note.versions[0].thumbnailKey}
                                    alt={`Thumbnail for ${note.title}`}
                                    className="w-full h-full object-cover object-top"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {note.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                <span>By {note.author.name || "Unknown"}</span>
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

            {isFetchingNextPage && (
                <div className="text-center py-4 text-gray-500">Loading more...</div>
            )}

            <div ref={ref} className="h-4" />
        </div>
    );
}
