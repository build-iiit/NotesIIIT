"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import Link from "next/link";
import { Search, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

export function AdminNotesTable() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "public" | "private">("all");

    const { data, isLoading, refetch } = api.admin.getAllNotes.useQuery({
        search,
        isPublic: filter === "all" ? undefined : filter === "public",
    });

    const deleteNoteMutation = api.admin.deleteNote.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleDeleteNote = async (noteId: string, noteTitle: string) => {
        if (confirm(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`)) {
            try {
                await deleteNoteMutation.mutateAsync({ noteId });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to delete note");
            }
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            {/* Search and Filter Header */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search notes by title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "all"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                            }`}
                    >
                        All Notes
                    </button>
                    <button
                        onClick={() => setFilter("public")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "public"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                            }`}
                    >
                        Public
                    </button>
                    <button
                        onClick={() => setFilter("private")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "private"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                            }`}
                    >
                        Private
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Note
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Author
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Visibility
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Stats
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Loading notes...
                                </td>
                            </tr>
                        ) : data?.notes && data.notes.length > 0 ? (
                            data.notes.map((note) => (
                                <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium max-w-md truncate">{note.title}</div>
                                            {note.description && (
                                                <div className="text-sm text-gray-500 max-w-md truncate">
                                                    {note.description}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400 mt-1">
                                                Created {new Date(note.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="font-medium">{note.author.name || "Anonymous"}</div>
                                        <div className="text-gray-500 text-xs">{note.author.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${note.isPublic
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400"
                                                }`}
                                        >
                                            {note.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                            {note.isPublic ? "Public" : "Private"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="text-gray-900 dark:text-gray-100">
                                            {note.viewCount} views • {note.voteScore} score
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                                            {note._count.comments} comments
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/notes/${note.id}`}
                                                target="_blank"
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                                title="View note"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteNote(note.id, note.title)}
                                                disabled={deleteNoteMutation.isPending}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
                                                title="Delete note"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No notes found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
