"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { TrendingUp, Eye } from "lucide-react";

export function TrendingNotes() {
    const { data: trendingNotes, isLoading } = api.notes.getTrending.useQuery();

    if (isLoading) {
        return (
            <div className="w-full max-w-6xl mb-12">
                <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!trendingNotes || trendingNotes.length === 0) return null;

    return (
        <div className="w-full max-w-6xl mb-12">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                    Trending Uploads
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingNotes.map((note) => (
                    <Link
                        key={note.id}
                        href={`/notes/${note.id}`}
                        className="group block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:border-orange-500/50 hover:-translate-y-1 relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-pink-500/0 to-purple-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-tr" />

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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            )}
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                        </div>

                        <div className="p-5 h-full flex flex-col relative z-10 flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg group-hover:text-orange-600 transition-colors line-clamp-1 pr-4">
                                    {note.title}
                                </h3>
                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                                    <Eye className="h-3 w-3" />
                                    {note.viewCount}
                                </div>
                            </div>

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
                                <span className="flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                                    View details &rarr;
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
