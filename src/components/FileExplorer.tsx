
"use client";

import { useState } from "react";
import { Folder, FileText, ChevronRight, FolderPlus, Trash2, ArrowLeft } from "lucide-react";
import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { useThemeStyle } from "@/components/ThemeStyleProvider";

interface FileExplorerProps {
    userId: string;
}

export function FileExplorer({ }: FileExplorerProps) {
    const { themeStyle } = useThemeStyle();
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    // const router = useRouter();
    const utils = api.useUtils();

    // Data fetching
    const { data, isLoading } = api.folders.getAll.useQuery(
        { parentId: currentFolderId },
        {
            refetchOnWindowFocus: false,
        }
    );

    const { data: breadcrumbs } = api.folders.getBreadcrumbs.useQuery(
        { folderId: currentFolderId! },
        { enabled: !!currentFolderId }
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

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState<{ type: 'folder' | 'note', id: string } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

    // Move Mutations
    const moveFolderMutation = api.folders.move.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
            utils.folders.getBreadcrumbs.invalidate({ folderId: currentFolderId! });
            setDraggedItem(null);
            setDragOverTarget(null);
        },
        onError: (error) => {
            alert(error.message);
            setDraggedItem(null);
            setDragOverTarget(null);
        }
    });

    const moveNoteMutation = api.notes.moveToFolder.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
            setDraggedItem(null);
            setDragOverTarget(null);
        },
        onError: (error) => {
            alert(error.message);
            setDraggedItem(null);
            setDragOverTarget(null);
        }
    });

    const handleDragStart = (e: React.DragEvent, type: 'folder' | 'note', id: string) => {
        setDraggedItem({ type, id });
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('id', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Prevent dropping on itself or if dragging a folder into a note (we don't drop on notes)
        if (draggedItem?.id === targetId) return;

        setDragOverTarget(targetId);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();

        if (!draggedItem) return;
        if (draggedItem.id === targetFolderId) {
            setDragOverTarget(null);
            return;
        }

        if (draggedItem.type === 'note') {
            moveNoteMutation.mutate({
                noteId: draggedItem.id,
                folderId: targetFolderId
            });
        } else {
            // Check if we are moving a folder into itself (basic check, full check on backend)
            if (draggedItem.id !== targetFolderId) {
                moveFolderMutation.mutate({
                    id: draggedItem.id,
                    parentId: targetFolderId
                });
            }
        }
        setDragOverTarget(null);
    };

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

    if (isLoading) {
        return <div className="py-8 text-center text-gray-500">Loading files...</div>;
    }

    return (
        <div className="relative">
            {/* Sunset Gradient Background */}
            <div className={`absolute inset-0 rounded-xl -z-10 ${themeStyle === "monochrome" ? "bg-primary/5" : "bg-gradient-to-br from-orange-400/25 via-pink-500/25 to-purple-600/25"}`} />

            {/* Layered Glass Container - iOS Style */}
            <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-white/[0.07] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/30 dark:border-white/20 p-6">
                {/* Inner glass layer for depth */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Folder className={`h-5 w-5 ${themeStyle === "monochrome" ? "text-primary" : "text-orange-500"}`} />
                        My Files
                    </h3>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm backdrop-blur-2xl text-white rounded-xl transition-all border border-white/30 hover:scale-[1.02] duration-300 w-full sm:w-auto ${themeStyle === "monochrome"
                            ? "bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] shadow-primary/30"
                            : "bg-gradient-to-r from-orange-500/60 to-pink-500/60 hover:from-orange-600/70 hover:to-pink-600/70 shadow-[0_4px_16px_0_rgba(251,113,133,0.3)] hover:shadow-[0_6px_24px_0_rgba(251,113,133,0.4)]"
                            }`}
                    >
                        <FolderPlus className="h-4 w-4" />
                        New Folder
                    </button>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300 overflow-x-auto pb-2">
                    <button
                        onClick={() => setCurrentFolderId(null)}
                        className={`px-3 py-1 rounded-lg backdrop-blur-sm transition-all ${!currentFolderId
                            ? (themeStyle === "monochrome" ? "bg-primary text-primary-foreground font-bold border border-white/30" : "bg-gradient-to-r from-orange-500/50 to-pink-500/50 text-white font-bold border border-white/30")
                            : "hover:bg-white/20 dark:hover:bg-white/10"
                            }`}
                    >
                        Home
                    </button>
                    {breadcrumbs?.map((crumb) => (
                        <div key={crumb.id} className="flex items-center gap-2 whitespace-nowrap">
                            <ChevronRight className="h-4 w-4" />
                            <button
                                onClick={() => setCurrentFolderId(crumb.id)}
                                className={`px-3 py-1 rounded-lg backdrop-blur-sm transition-all ${currentFolderId === crumb.id
                                    ? (themeStyle === "monochrome" ? "bg-primary text-primary-foreground font-bold border border-white/30" : "bg-gradient-to-r from-orange-500/50 to-pink-500/50 text-white font-bold border border-white/30")
                                    : "hover:bg-white/20 dark:hover:bg-white/10"
                                    }`}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Back Button - Drop Zone */}
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
                        onDragOver={(e) => {
                            if (breadcrumbs && breadcrumbs.length > 0) {
                                // If there is a grandparent to go back to
                                const parent = breadcrumbs[breadcrumbs.length - 2];
                                handleDragOver(e, parent ? parent.id : null);
                            } else {
                                // Going back to root
                                handleDragOver(e, null);
                            }
                        }}
                        onDrop={(e) => {
                            if (breadcrumbs && breadcrumbs.length > 0) {
                                const parent = breadcrumbs[breadcrumbs.length - 2];
                                handleDrop(e, parent ? parent.id : null);
                            } else {
                                handleDrop(e, null);
                            }
                        }}
                        className={`mb-4 text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-all border border-white/20 ${dragOverTarget === (breadcrumbs && breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2]?.id ?? null : null)
                            ? (themeStyle === "monochrome" ? "bg-primary/30 border-primary text-primary/80" : "bg-orange-500/30 border-orange-500 text-orange-100")
                            : "bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300"
                            }`}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back (Drop to Move Up)
                    </button>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {/* Folders */}
                    {data?.folders.map((folder) => (
                        <div
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                            onDragOver={(e) => handleDragOver(e, folder.id)}
                            onDrop={(e) => handleDrop(e, folder.id)}
                            className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] border cursor-pointer
                                ${dragOverTarget === folder.id
                                    ? (themeStyle === "monochrome" ? "bg-primary/20 border-primary scale-[1.05] shadow-lg shadow-primary/20" : "bg-orange-500/20 border-orange-500 scale-[1.05] shadow-[0_0_20px_0_rgba(249,115,22,0.4)]")
                                    : `bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border-white/25 active:scale-[0.98] ${themeStyle === "monochrome" ? "hover:bg-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.05]" : "hover:from-orange-500/20 hover:via-pink-500/15 hover:to-orange-500/20 hover:border-orange-300/50 hover:scale-[1.05] hover:shadow-[0_12px_32px_0_rgba(251,146,60,0.25)]"}`
                                }`}
                        >
                            {/* Inner glow layer */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <button
                                onClick={(e) => handleDeleteFolder(folder.id, e)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 backdrop-blur-md bg-red-500/80 text-white hover:bg-red-600/90 rounded-lg transition-all shadow-lg border border-white/30"
                                title="Delete Folder"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>

                            <Folder className={`h-10 w-10 mb-2 drop-shadow-lg transition-colors ${dragOverTarget === folder.id
                                ? (themeStyle === "monochrome" ? "text-primary fill-primary/30" : "text-orange-500 fill-orange-500/30")
                                : (themeStyle === "monochrome" ? "text-gray-400 group-hover:text-primary fill-primary/5 group-hover:fill-primary/20" : "text-yellow-500 fill-yellow-500/30")
                                }`} />
                            <span className="text-sm font-medium text-center truncate w-full text-gray-800 dark:text-gray-200">{folder.name}</span>
                        </div>
                    ))}

                    {/* Files */}
                    {data?.notes.map((note) => (
                        <Link
                            key={note.id}
                            href={`/notes/${note.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'note', note.id)}
                            className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.15] dark:from-white/[0.1] dark:via-white/[0.05] dark:to-white/[0.08] transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] border border-white/25 active:scale-[0.98] cursor-grab active:cursor-grabbing ${themeStyle === 'monochrome'
                                ? 'hover:bg-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.05]'
                                : 'hover:from-purple-500/20 hover:via-blue-500/15 hover:to-purple-500/20 hover:shadow-[0_12px_32px_0_rgba(147,51,234,0.25)] hover:border-purple-300/50 hover:scale-[1.05]'
                                }`}
                        >
                            {/* Inner glow layer */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="relative">
                                {/* Thumbnail or Icon */}
                                {note.thumbnailS3Key ? (
                                    <div className="h-16 w-16 mb-2 rounded-lg shadow-md overflow-hidden bg-white/50">
                                        {/* Note: In a real app we'd use Next.js Image with a proper loader. 
                                             Using a raw img tag here for simplicity but it should be optimized.
                                             We can generate a signed URL on the backend or use a public URL if public.
                                         */}
                                        <div
                                            className="w-full h-full bg-cover bg-center"
                                            style={{ backgroundImage: `url(https://d36u8i333158ha.cloudfront.net/${note.thumbnailS3Key})` }}
                                        />
                                    </div>
                                ) : (

                                    <FileText className={`h-10 w-10 mb-2 transition-colors drop-shadow-lg ${themeStyle === "monochrome" ? "text-gray-500 group-hover:text-primary" : "text-gray-600 dark:text-gray-300 group-hover:text-purple-500"}`} />
                                )}

                                <div className="absolute -bottom-1 -right-1 backdrop-blur-sm bg-white/60 dark:bg-black/40 text-[10px] px-1.5 py-0.5 rounded border border-white/40 text-gray-700 dark:text-gray-300 font-semibold">
                                    PDF
                                </div>
                            </div>
                            <span className={`text-sm font-medium text-center truncate w-full text-gray-800 dark:text-gray-200 ${themeStyle === "monochrome" ? "group-hover:text-primary" : "group-hover:text-purple-700 dark:group-hover:text-purple-400"}`}>
                                {note.title}
                            </span>
                        </Link>
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
                            {/* Inner glass layer */}
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
                                        className={`px-4 py-2 text-sm backdrop-blur-md text-white rounded-lg disabled:opacity-50 transition-all shadow-lg border border-white/30 ${themeStyle === "monochrome"
                                            ? "bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)]"
                                            : "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                                            }`}
                                    >
                                        {createFolderMutation.isPending ? "Creating..." : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
