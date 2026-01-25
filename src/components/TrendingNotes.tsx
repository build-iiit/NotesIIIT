"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { TrendingUp, Eye } from "lucide-react";

export function TrendingNotes() {
    const { data, isLoading } = api.notes.getAll.useQuery({ cursor: undefined, limit: 50 });

    // Sort by voteScore to get trending notes
    const trendingNotes = (data?.items || [])
        .sort((a: { voteScore?: number }, b: { voteScore?: number }) => (b.voteScore || 0) - (a.voteScore || 0))
        .slice(0, 5); // Top 5 trending

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
                        className="group block backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border border-white/20 hover:border-orange-300/30 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.2)] transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="p-5 h-full flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg group-hover:text-orange-600 transition-colors line-clamp-1 pr-4">
                                    {note.title}
                                </h3>
                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
                                    <Eye className="h-3 w-3" />
                                    {note.viewCount}
                                </div>
                            </div>

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

                            <div className="mt-auto flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-white/10">
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
