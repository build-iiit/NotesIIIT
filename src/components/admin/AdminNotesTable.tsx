"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import Link from "next/link";
import { Search, Trash2, Eye, EyeOff, ExternalLink, CheckSquare, Square, Lock, Globe, Users } from "lucide-react";

export function AdminNotesTable() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "public" | "private">("all");
    const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

    const { data, isLoading, refetch } = api.admin.getAllNotes.useQuery({
        search,
        isPublic: filter === "all" ? undefined : filter === "public",
    });

    const deleteNoteMutation = api.admin.deleteNote.useMutation({
        onSuccess: () => refetch(),
    });

    const bulkDeleteMutation = api.admin.bulkDeleteNotes.useMutation({
        onSuccess: () => {
            refetch();
            setSelectedNotes([]);
        },
    });

    const toggleVisibilityMutation = api.admin.toggleNoteVisibility.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    // Individual Actions
    const handleDeleteNote = async (noteId: string, noteTitle: string) => {
        if (confirm(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`)) {
            try {
                await deleteNoteMutation.mutateAsync({ noteId });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to delete note");
            }
        }
    };

    const handleVisibilityToggle = async (noteId: string, currentVisibility: string) => {
        // Cycle: PUBLIC -> PRIVATE -> GROUP -> PUBLIC
        const nextVisibility = currentVisibility === "PUBLIC" ? "PRIVATE" :
            currentVisibility === "PRIVATE" ? "GROUP" : "PUBLIC";

        try {
            await toggleVisibilityMutation.mutateAsync({
                noteId,
                visibility: nextVisibility as "PUBLIC" | "PRIVATE" | "GROUP"
            });
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to update visibility");
        }
    };

    // Bulk Actions
    const toggleNoteSelection = (noteId: string) => {
        setSelectedNotes(prev =>
            prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
        );
    };

    const toggleAllNotes = () => {
        if (!data?.notes) return;
        if (selectedNotes.length === data.notes.length) {
            setSelectedNotes([]);
        } else {
            setSelectedNotes(data.notes.map(n => n.id));
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedNotes.length} notes? This action cannot be undone.`)) {
            try {
                await bulkDeleteMutation.mutateAsync({ noteIds: selectedNotes });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to delete notes");
            }
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case "PUBLIC": return <Globe className="w-3 h-3" />;
            case "PRIVATE": return <Lock className="w-3 h-3" />;
            case "GROUP": return <Users className="w-3 h-3" />;
            default: return <Eye className="w-3 h-3" />;
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case "PUBLIC": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "PRIVATE": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            case "GROUP": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
            default: return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400";
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            {/* Search and Filter Header */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search notes by title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex gap-2 items-center">
                        {selectedNotes.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center gap-2 animate-in fade-in"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedNotes.length})
                            </button>
                        )}

                        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                            {(["all", "public", "private"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === t
                                        ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                        }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left w-10">
                                <button
                                    onClick={toggleAllNotes}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {data?.notes && data.notes.length > 0 && selectedNotes.length === data.notes.length ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Loading notes...
                                </td>
                            </tr>
                        ) : data?.notes && data.notes.length > 0 ? (
                            data.notes.map((note) => (
                                <tr key={note.id} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${selectedNotes.includes(note.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleNoteSelection(note.id)}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {selectedNotes.includes(note.id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
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
                                        <button
                                            onClick={() => handleVisibilityToggle(note.id, note.visibility)}
                                            disabled={toggleVisibilityMutation.isPending}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${getVisibilityColor(note.visibility)}`}
                                            title="Click to cycle visibility"
                                        >
                                            {getVisibilityIcon(note.visibility)}
                                            {note.visibility}
                                        </button>
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
