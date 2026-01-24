"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { Bookmark, FileText, ArrowRight } from "lucide-react";

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
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pt-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your bookmarks...</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalBookmarks = bookmarks?.length || 0;
    const totalNotes = Object.keys(groupedBookmarks || {}).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pt-20 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Bookmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold">My Bookmarks</h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {totalBookmarks === 0
                            ? "You haven't bookmarked any pages yet"
                            : `${totalBookmarks} bookmarked ${totalBookmarks === 1 ? 'page' : 'pages'} across ${totalNotes} ${totalNotes === 1 ? 'note' : 'notes'}`
                        }
                    </p>
                </div>

                {/* Bookmarks List */}
                {totalBookmarks === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                        <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start bookmarking pages in your notes to see them here
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse Notes
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {(Object.entries(groupedBookmarks || {}) as [string, { note: { id: string; title: string }; bookmarks: BookmarkWithNote[] }][]).map(([noteId, data]) => (
                            <div
                                key={noteId}
                                className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
                            >
                                {/* Note Header */}
                                <Link
                                    href={`/notes/${noteId}`}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        <h2 className="font-semibold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {data.note.title}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{data.bookmarks.length} {data.bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </Link>

                                {/* Bookmarks */}
                                <div className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {data.bookmarks
                                            .sort((a: BookmarkWithNote, b: BookmarkWithNote) => a.pageNumber - b.pageNumber)
                                            .map((bookmark: BookmarkWithNote) => (
                                                <Link
                                                    key={bookmark.id}
                                                    href={`/notes/${noteId}?page=${bookmark.pageNumber}`}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Bookmark className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                                                        <span className="font-medium">Page {bookmark.pageNumber}</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
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
