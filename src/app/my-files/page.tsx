"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Folder, FileText, ChevronRight, FolderPlus, Trash2, ArrowLeft, Home, GripVertical } from "lucide-react";
import { api } from "@/app/_trpc/client";
import Link from "next/link";

function MyFilesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFolderId = searchParams.get("folderId");

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const utils = api.useUtils();

    // Check authentication
    const { data: currentUser, isLoading: userLoading } = api.auth.getMe.useQuery();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!userLoading && !currentUser) {
            router.push("/login");
        }
    }, [currentUser, userLoading, router]);

    // Data fetching
    const { data, isLoading } = api.folders.getAll.useQuery(
        { parentId: currentFolderId },
        {
            enabled: !!currentUser,
            refetchOnWindowFocus: false,
        }
    );

    const { data: breadcrumbs } = api.folders.getBreadcrumbs.useQuery(
        { folderId: currentFolderId! },
        { enabled: !!currentFolderId && !!currentUser }
    );

    // Mutations
    const createFolderMutation = api.folders.create.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
            setIsCreateModalOpen(false);
            setNewFolderName("");
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const deleteFolderMutation = api.folders.delete.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const moveToFolderMutation = api.notes.moveToFolder.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate();
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        createFolderMutation.mutate({
            name: newFolderName,
            parentId: currentFolderId || undefined
        });
    };

    const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this folder?")) {
            deleteFolderMutation.mutate({ id });
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, noteId: string) => {
        setDraggedNoteId(noteId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
        setDraggedNoteId(null);
        setDragOverFolderId(null);
    };

    const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverFolderId(folderId);
    };

    const handleDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        if (draggedNoteId && targetFolderId !== currentFolderId) {
            moveToFolderMutation.mutate({
                noteId: draggedNoteId,
                folderId: targetFolderId,
            });
        }
        setDraggedNoteId(null);
        setDragOverFolderId(null);
    };

    // Update URL when folder changes
    useEffect(() => {
        if (currentFolderId) {
            router.replace(`/my-files?folderId=${currentFolderId}`, { scroll: false });
        } else {
            router.replace("/my-files", { scroll: false });
        }
    }, [currentFolderId, router]);

    if (userLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="py-8 text-center text-gray-500">Loading files...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Folder className="h-8 w-8 text-orange-500" />
                        My Files
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your notes and folders. Drag files to move them between folders.
                    </p>
                </div>

                {/* Main Content */}
                <div className="relative">
                    {/* Sunset Gradient Background - Removed as it's now global in layout.tsx */}
                    {/* <div className="absolute inset-0 bg-gradient-to-br from-orange-400/25 via-pink-500/25 to-purple-600/25 rounded-xl -z-10" /> */}

                    {/* Layered Glass Container */}
                    <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-white/[0.07] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/30 dark:border-white/20 p-6">
                        {/* Inner glass layer */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Folder className="h-5 w-5 text-orange-500" />
                                {currentFolderId ? breadcrumbs?.[breadcrumbs.length - 1]?.name || "Folder" : "Root"}
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="relative flex items-center gap-2 px-4 py-2 text-sm backdrop-blur-2xl bg-gradient-to-r from-orange-500/60 to-pink-500/60 text-white rounded-xl hover:from-orange-600/70 hover:to-pink-600/70 transition-all shadow-[0_4px_16px_0_rgba(251,113,133,0.3)] hover:shadow-[0_6px_24px_0_rgba(251,113,133,0.4)] border border-white/30 hover:scale-[1.02] duration-300"
                            >
                                <FolderPlus className="h-4 w-4" />
                                New Folder
                            </button>
                        </div>

                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto pb-2">
                            <button
                                onClick={() => setCurrentFolderId(null)}
                                onDragOver={(e) => handleDragOver(e, null)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, null)}
                                className={`px-3 py-1 rounded-lg backdrop-blur-sm transition-all flex items-center gap-1 ${!currentFolderId
                                    ? 'bg-gradient-to-r from-orange-500/50 to-pink-500/50 text-white font-bold border border-white/30'
                                    : 'hover:bg-white/20 dark:hover:bg-white/10'
                                    } ${dragOverFolderId === null && draggedNoteId ? 'ring-2 ring-orange-500 bg-orange-500/20' : ''}`}
                            >
                                <Home className="h-3 w-3" />
                                Root
                            </button>
                            {breadcrumbs?.map((crumb) => (
                                <div key={crumb.id} className="flex items-center gap-2 whitespace-nowrap">
                                    <ChevronRight className="h-4 w-4" />
                                    <button
                                        onClick={() => setCurrentFolderId(crumb.id)}
                                        onDragOver={(e) => handleDragOver(e, crumb.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, crumb.id)}
                                        className={`px-3 py-1 rounded-lg backdrop-blur-sm transition-all ${currentFolderId === crumb.id
                                            ? 'bg-gradient-to-r from-orange-500/50 to-pink-500/50 text-white font-bold border border-white/30'
                                            : 'hover:bg-white/20 dark:hover:bg-white/10'
                                            } ${dragOverFolderId === crumb.id && draggedNoteId ? 'ring-2 ring-orange-500 bg-orange-500/20' : ''}`}
                                    >
                                        {crumb.name}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Back Button */}
                        {currentFolderId && (
                            <button
                                onClick={() => {
                                    if (breadcrumbs && breadcrumbs.length > 0) {
                                        const parent = breadcrumbs[breadcrumbs.length - 2];
                                        setCurrentFolderId(parent ? parent.id : null);
                                    } else {
                                        setCurrentFolderId(null);
                                    }
                                }}
                                className="mb-4 text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 transition-all border border-white/20"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        )}

                        {/* Content Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {/* Folders */}
                            {data?.folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    onClick={() => setCurrentFolderId(folder.id)}
                                    onDragOver={(e) => handleDragOver(e, folder.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-500/20 hover:via-pink-500/15 hover:to-orange-500/20 cursor-pointer transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_0_rgba(251,146,60,0.25)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.05] active:scale-[0.98] ${dragOverFolderId === folder.id && draggedNoteId ? 'ring-2 ring-orange-500 bg-orange-500/20 scale-105' : ''
                                        }`}
                                >
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <button
                                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 backdrop-blur-md bg-red-500/80 text-white hover:bg-red-600/90 rounded-lg transition-all shadow-lg border border-white/30"
                                        title="Delete Folder"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                    <Folder className="h-10 w-10 text-yellow-500 mb-2 fill-yellow-500/30 drop-shadow-lg" />
                                    <span className="text-sm font-medium text-center truncate w-full text-gray-800 dark:text-gray-200">{folder.name}</span>
                                </div>
                            ))}

                            {/* Files */}
                            {data?.notes.map((note) => (
                                <div
                                    key={note.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, note.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.15] dark:from-white/[0.1] dark:via-white/[0.05] dark:to-white/[0.08] hover:from-purple-500/20 hover:via-blue-500/15 hover:to-purple-500/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_0_rgba(147,51,234,0.25)] border border-white/25 hover:border-purple-300/50 hover:scale-[1.05] active:scale-[0.98] cursor-grab active:cursor-grabbing ${draggedNoteId === note.id ? 'opacity-50 scale-95' : ''
                                        }`}
                                >
                                    {/* Drag handle indicator */}
                                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
                                        <GripVertical className="h-4 w-4 text-gray-500" />
                                    </div>

                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <div className="relative">
                                        <FileText className="h-10 w-10 text-gray-600 dark:text-gray-300 group-hover:text-purple-500 mb-2 transition-colors drop-shadow-lg" />
                                        <div className="absolute -bottom-1 -right-1 backdrop-blur-sm bg-white/60 dark:bg-black/40 text-[10px] px-1.5 py-0.5 rounded border border-white/40 text-gray-700 dark:text-gray-300 font-semibold">
                                            PDF
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-center truncate w-full text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                                        {note.title}
                                    </span>

                                    {/* Click to open link */}
                                    <Link
                                        href={`/notes/${note.id}`}
                                        className="absolute inset-0 z-10"
                                        onClick={(e) => e.stopPropagation()}
                                        draggable={false}
                                    />
                                </div>
                            ))}

                            {/* Empty State */}
                            {(!data?.folders.length && !data?.notes.length) && (
                                <div className="col-span-full py-12 text-center">
                                    <Folder className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2 opacity-50" />
                                    <p className="text-gray-600 dark:text-gray-400">This folder is empty</p>
                                </div>
                            )}
                        </div>

                        {/* Create Folder Modal */}
                        {isCreateModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xl animate-in fade-in duration-300">
                                <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/60 via-white/40 to-white/50 dark:from-black/40 dark:via-black/30 dark:to-black/35 rounded-3xl p-8 w-full max-w-sm shadow-[0_24px_48px_0_rgba(0,0,0,0.25)] border border-white/40 dark:border-white/20 animate-in zoom-in-95 duration-300">
                                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Create New Folder</h3>
                                    <form onSubmit={handleCreateFolder}>
                                        <input
                                            type="text"
                                            placeholder="Folder Name"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            className="w-full px-4 py-2 mb-4 rounded-lg backdrop-blur-md bg-white/40 dark:bg-black/25 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreateModalOpen(false)}
                                                className="px-4 py-2 text-sm backdrop-blur-sm bg-white/30 dark:bg-white/10 hover:bg-white/50 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg transition-all border border-white/30"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                                className="px-4 py-2 text-sm backdrop-blur-md bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg border border-white/30"
                                            >
                                                {createFolderMutation.isPending ? "Creating..." : "Create"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MyFilesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        }>
            <MyFilesContent />
        </Suspense>
    );
}
