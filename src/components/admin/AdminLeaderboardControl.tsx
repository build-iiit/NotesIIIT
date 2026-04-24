"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Star, Pin, Trophy, RefreshCw, Search, Eye } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

export function AdminLeaderboardControl() {
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        action: "clearFeatured" | "clearPinned" | null;
    }>({ isOpen: false, action: null });

    const { data: featured, isLoading: loadingFeatured, refetch: refetchFeatured } =
        api.admin.getAllNotes.useQuery({ limit: 50 }, {
            select: (data) => data.notes.filter((n: { isFeatured?: boolean }) => n.isFeatured),
        });

    const { data: pinned, isLoading: loadingPinned, refetch: refetchPinned } =
        api.admin.getAllNotes.useQuery({ limit: 50 }, {
            select: (data) => data.notes.filter((n: { isPinned?: boolean }) => n.isPinned),
        });

    const featureMutation = api.admin.featureNote.useMutation({
        onSuccess: () => {
            refetchFeatured();
            refetchPinned();
        },
    });

    const pinMutation = api.admin.pinNote.useMutation({
        onSuccess: () => {
            refetchFeatured();
            refetchPinned();
        },
    });

    const handleUnfeatureAll = async () => {
        if (!featured) return;
        await Promise.all(
            featured.map((note) =>
                featureMutation.mutateAsync({ noteId: note.id, featured: false })
            )
        );
        setConfirmDialog({ isOpen: false, action: null });
    };

    const handleUnpinAll = async () => {
        if (!pinned) return;
        await Promise.all(
            pinned.map((note) =>
                pinMutation.mutateAsync({ noteId: note.id, pinned: false })
            )
        );
        setConfirmDialog({ isOpen: false, action: null });
    };

    const handleUnfeature = async (noteId: string) => {
        await featureMutation.mutateAsync({ noteId, featured: false });
    };

    const handleUnpin = async (noteId: string) => {
        await pinMutation.mutateAsync({ noteId, pinned: false });
    };

    interface Note {
        id: string;
        title: string;
        viewCount?: number;
        voteScore?: number;
        author?: {
            name?: string | null;
            email?: string | null;
        };
    }

    const filteredFeatured = (featured as Note[] | undefined)?.filter((n: Note) =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPinned = (pinned as Note[] | undefined)?.filter((n: Note) =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Leaderboard Control</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage featured and pinned notes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="font-medium">Featured Notes</h3>
                        </div>
                        <span className="text-2xl font-bold">{featured?.length || 0}</span>
                    </div>
                    {(featured?.length || 0) > 0 && (
                        <button
                            onClick={() => setConfirmDialog({ isOpen: true, action: "clearFeatured" })}
                            className="w-full py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                            Clear All Featured
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Pin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-medium">Pinned Notes</h3>
                        </div>
                        <span className="text-2xl font-bold">{pinned?.length || 0}</span>
                    </div>
                    {(pinned?.length || 0) > 0 && (
                        <button
                            onClick={() => setConfirmDialog({ isOpen: true, action: "clearPinned" })}
                            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                            Clear All Pinned
                        </button>
                    )}
                </div>
            </div>

            {/* Featured Notes List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h3 className="font-medium">Featured Notes</h3>
                    </div>
                    <button
                        onClick={() => { refetchFeatured(); refetchPinned(); }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {loadingFeatured ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : filteredFeatured && filteredFeatured.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {filteredFeatured.map((note: Note) => (
                            <div key={note.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{note.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        By {note.author?.name || note.author?.email || "Unknown"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Eye className="w-4 h-4" />
                                        {note.viewCount || 0}
                                    </div>
                                    <button
                                        onClick={() => handleUnfeature(note.id)}
                                        disabled={featureMutation.isPending}
                                        className="px-3 py-1.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Unfeature
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No featured notes
                    </div>
                )}
            </div>

            {/* Pinned Notes List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Pin className="w-5 h-5 text-blue-500" />
                        <h3 className="font-medium">Pinned Notes</h3>
                    </div>
                </div>

                {loadingPinned ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : filteredPinned && filteredPinned.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {filteredPinned.map((note: Note) => (
                            <div key={note.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{note.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        By {note.author?.name || note.author?.email || "Unknown"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Eye className="w-4 h-4" />
                                        {note.viewCount || 0}
                                    </div>
                                    <button
                                        onClick={() => handleUnpin(note.id)}
                                        disabled={pinMutation.isPending}
                                        className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Unpin
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No pinned notes
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, action: null })}
                onConfirm={confirmDialog.action === "clearFeatured" ? handleUnfeatureAll : handleUnpinAll}
                title={confirmDialog.action === "clearFeatured" ? "Clear All Featured Notes" : "Clear All Pinned Notes"}
                message={`Are you sure you want to remove ${confirmDialog.action === "clearFeatured" ? "featured" : "pinned"} status from all notes? This action cannot be undone.`}
                confirmText="Clear All"
                variant="warning"
                isLoading={featureMutation.isPending || pinMutation.isPending}
            />
        </div>
    );
}
