"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { Bookmark, FileText, ArrowRight, Loader2 } from "lucide-react";

export default function BookmarksPage() {
    const { data: bookmarks, isLoading } = api.bookmarks.getAll.useQuery();

    // Group bookmarks by note
    type BookmarkWithNote = NonNullable<typeof bookmarks>[number];
    type GroupedBookmarks = Record<string, { note: { id: string; title: string }; bookmarks: BookmarkWithNote[] }>;

    const groupedBookmarks = bookmarks?.reduce((acc: GroupedBookmarks, bookmark: BookmarkWithNote) => {
        const noteId = bookmark.note.id;
        if (!acc[noteId]) {
            acc[noteId] = {
                note: bookmark.note,
                bookmarks: [],
            };
        }
        acc[noteId].bookmarks.push(bookmark);
        return acc;
    }, {} as GroupedBookmarks);

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
            </div>
        );
    }

    const totalBookmarks = bookmarks?.length || 0;
    const totalNotes = Object.keys(groupedBookmarks || {}).length;

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent inline-flex items-center gap-3">
                        <Bookmark className="h-8 w-8 text-orange-500 fill-orange-500" />
                        My Bookmarks
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                        {totalBookmarks === 0
                            ? "Your collection of important pages"
                            : `You have ${totalBookmarks} ${totalBookmarks === 1 ? 'page' : 'pages'} saved across ${totalNotes} ${totalNotes === 1 ? 'note' : 'notes'}`
                        }
                    </p>
                </div>

                {/* Bookmarks List */}
                {totalBookmarks === 0 ? (
                    <div className="glass-card rounded-3xl p-12 text-center border border-white/20 dark:border-white/10">
                        <div className="bg-orange-500/10 p-6 rounded-full w-fit mx-auto mb-6">
                            <Bookmark className="w-16 h-16 text-orange-500 mx-auto" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Time to explore!</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                            When reading a note, click the <strong className="text-orange-500">bookmark icon</strong> (or press 'B') to save specific pages here for quick access.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all"
                        >
                            Browse Notes
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {(Object.entries(groupedBookmarks || {}) as [string, { note: { id: string; title: string }; bookmarks: BookmarkWithNote[] }][]).map(([noteId, data]) => (
                            <div
                                key={noteId}
                                className="glass-card rounded-3xl overflow-hidden group hover:border-orange-500/30 transition-all duration-500"
                            >
                                {/* Note Header */}
                                <Link
                                    href={`/notes/${noteId}`}
                                    className="flex items-center justify-between p-6 bg-white/30 dark:bg-white/5 border-b border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                                                {data.note.title}
                                            </h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {data.bookmarks.length} saved {data.bookmarks.length === 1 ? 'page' : 'pages'}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-transform group-hover:translate-x-1" />
                                </Link>

                                {/* Bookmarks Grid */}
                                <div className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {data.bookmarks
                                            .sort((a: BookmarkWithNote, b: BookmarkWithNote) => a.pageNumber - b.pageNumber)
                                            .map((bookmark: BookmarkWithNote) => (
                                                <Link
                                                    key={bookmark.id}
                                                    href={`/notes/${noteId}?page=${bookmark.pageNumber}`}
                                                    className="relative group/page flex flex-col items-center justify-center p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all hover:-translate-y-1 hover:shadow-lg"
                                                >
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover/page:opacity-100 transition-opacity">
                                                        <ArrowRight className="w-3 h-3 text-orange-500" />
                                                    </div>
                                                    <Bookmark className="w-8 h-8 text-orange-400/50 group-hover/page:text-orange-500 fill-current mb-2 transition-colors" />
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover/page:text-orange-500">
                                                        Page {bookmark.pageNumber}
                                                    </span>
                                                </Link>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
