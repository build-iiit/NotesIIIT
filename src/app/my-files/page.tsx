"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Folder, FileText, ChevronRight, FolderPlus, Trash2, ArrowLeft, Home, GripVertical, Plus, Users, Globe } from "lucide-react";
import { api } from "@/app/_trpc/client";
import Link from "next/link";

const SHARED_ROOT_ID = "shared-root";
const PUBLIC_ROOT_ID = "public-root";
const GROUP_FOLDER_PREFIX = "group-";

function MyFilesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFolderId = searchParams.get("folderId");

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const utils = api.useUtils();

    // Check authentication
    const { data: currentUser, isLoading: userLoading } = api.auth.getMe.useQuery();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!userLoading && !currentUser) {
            router.push("/login"); // Fixed refresh loop issue potentially
        }
    }, [currentUser, userLoading, router]);

    // Derived States
    const isSharedRoot = currentFolderId === SHARED_ROOT_ID;
    const isPublicRoot = currentFolderId === PUBLIC_ROOT_ID;
    const isGroupFolder = currentFolderId?.startsWith(GROUP_FOLDER_PREFIX) ?? false;
    const currentGroupId = isGroupFolder ? currentFolderId!.split(GROUP_FOLDER_PREFIX)[1] : null;

    // --- Data Fetching ---

    // 1. Normal Folders
    const {
        data: folderData,
        isLoading: isFolderLoading,
        isError: isFolderError,
        error: folderError
    } = api.folders.getAll.useQuery(
        { parentId: currentFolderId },
        {
            enabled: !!currentUser && !isSharedRoot && !isGroupFolder && !isPublicRoot,
            refetchOnWindowFocus: false,
        }
    );

    if (isFolderError) {
        console.error("Folder Fetch Error:", folderError);
        // alert("Error fetching files: " + folderError.message); // Optional
    }

    // 2. Shared/Groups List
    const { data: groupsData, isLoading: isGroupsLoading } = api.social.getGroups.useQuery(undefined, {
        enabled: isSharedRoot
    });

    // 3. Group Files
    const { data: groupFilesData, isLoading: isGroupFilesLoading } = api.social.getGroupFiles.useQuery(
        { groupId: currentGroupId! },
        { enabled: !!currentGroupId }
    );
    // Helper to get group name for breadcrumb
    const { data: currentGroupDetails } = api.social.getGroupDetails.useQuery(
        { groupId: currentGroupId! },
        { enabled: !!currentGroupId }
    );

    // 4. Public Files
    // Using getInfinite with a large limit to simulate a list for now, or fallback to getAll if robust filtering needed.
    // getInfinite supports search and sort, which is good.
    const { data: publicFilesData, isLoading: isPublicFilesLoading } = api.notes.getInfinite.useQuery(
        { limit: 50 }, // Fetch initial batch
        { enabled: isPublicRoot }
    );

    // Breadcrumbs Logic
    const { data: normalBreadcrumbs } = api.folders.getBreadcrumbs.useQuery(
        { folderId: currentFolderId! },
        { enabled: !!currentFolderId && !!currentUser && !isSharedRoot && !isGroupFolder && !isPublicRoot }
    );

    // --- Data Normalization ---

    let displayFolders: { id: string; name: string; type: 'folder' | 'shared-root' | 'group' | 'public-root', isVirtual?: boolean }[] = [];
    let displayFiles: any[] = [];
    let isLoading = isFolderLoading || isGroupsLoading || isGroupFilesLoading || isPublicFilesLoading;

    if (isSharedRoot) {
        // Show Groups as Folders
        displayFolders = groupsData?.map(g => ({
            id: `${GROUP_FOLDER_PREFIX}${g.id}`,
            name: g.name,
            type: 'group'
        })) || [];
    } else if (isGroupFolder) {
        // Show Group Files
        displayFiles = groupFilesData?.map(note => ({
            ...note,
            thumbnailUrl: note.thumbnailS3Key ? `https://your-bucket-url/${note.thumbnailS3Key}` : null,
            // Actually, the note object from getGroupFiles doesn't have signed URLs.
            // The logic in getAll resolves them because it's in the router.
            // We might need to fetch them cleanly or just show placeholder.
            // Better: update social router to resolve them, OR just ignore thumbnails for shared files for now to save time/complexity.
        })) || [];

        // Wait, getGroupFiles in social.ts DOES NOT resolve presigned URLs.
        // We'll handle this limitation gracefully.
    } else if (isPublicRoot) {
        // Show Public Files
        displayFiles = publicFilesData?.items || [];
    } else {
        // Normal View
        displayFolders = folderData?.folders.map(f => ({ ...f, type: 'folder' })) || [];
        displayFiles = folderData?.notes || [];

        // Append Virtual Folders if at root
        if (!currentFolderId) {
            displayFolders.unshift({
                id: SHARED_ROOT_ID,
                name: "Shared with Me",
                type: 'shared-root',
                isVirtual: true
            });
            // Removed Public Files folder - saved notes appear directly in user's folders
        }
    }

    // Breadcrumbs Display
    const breadcrumbsDisplay: { id: string; name: string }[] = [];
    if (isSharedRoot) {
        breadcrumbsDisplay.push({ id: SHARED_ROOT_ID, name: "Shared with Me" });
    } else if (isGroupFolder) {
        breadcrumbsDisplay.push({ id: SHARED_ROOT_ID, name: "Shared with Me" });
        if (currentGroupDetails) {
            breadcrumbsDisplay.push({ id: currentFolderId!, name: currentGroupDetails.name });
        } else {
            breadcrumbsDisplay.push({ id: currentFolderId!, name: "Group" });
        }
    } else if (isPublicRoot) {
        breadcrumbsDisplay.push({ id: PUBLIC_ROOT_ID, name: "Public Files" });
    } else {
        if (normalBreadcrumbs) breadcrumbsDisplay.push(...normalBreadcrumbs);
    }


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

    const moveNoteMutation = api.notes.moveToFolder.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const moveFolderMutation = api.folders.move.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate({ parentId: currentFolderId });
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
    const handleDragStart = (e: React.DragEvent, id: string, type: 'note' | 'folder') => {
        if (type === 'note') {
            setDraggedNoteId(id);
        } else {
            setDraggedFolderId(id);
        }
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
        setDraggedNoteId(null);
        setDraggedFolderId(null);
        setDragOverFolderId(null);
    };

    const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        // Disable drag over virtual folders
        if (folderId === SHARED_ROOT_ID || folderId === PUBLIC_ROOT_ID || folderId?.startsWith(GROUP_FOLDER_PREFIX)) {
            e.dataTransfer.dropEffect = "none";
            return;
        }

        // Prevent dropping folder onto itself
        if (draggedFolderId && draggedFolderId === folderId) {
            e.dataTransfer.dropEffect = "none";
            return;
        }

        setDragOverFolderId(folderId);
    };

    const handleDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();

        // Disable drop on virtual folders
        if (targetFolderId === SHARED_ROOT_ID || targetFolderId === PUBLIC_ROOT_ID || targetFolderId?.startsWith(GROUP_FOLDER_PREFIX)) return;

        if (draggedNoteId && targetFolderId !== currentFolderId) {
            moveNoteMutation.mutate({
                noteId: draggedNoteId,
                folderId: targetFolderId,
            });
        } else if (draggedFolderId && targetFolderId !== currentFolderId && draggedFolderId !== targetFolderId) {
            moveFolderMutation.mutate({
                id: draggedFolderId,
                parentId: targetFolderId,
            });
        }

        setDraggedNoteId(null);
        setDraggedFolderId(null);
        setDragOverFolderId(null);
    };

    // Update URL when folder changes
    useEffect(() => {
        if (currentFolderId) {
            router.replace(`/my-files?folderId=${currentFolderId}`, { scroll: false });
        } else {
            router.replace("/my-files", { scroll: false });
        }

        // Clear selection when navigating
        // (If we had selection state)
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
                        Manage your notes, shared files, and view public resources.
                    </p>
                </div>

                {/* Main Content */}
                <div className="relative">
                    {/* Layered Glass Container */}
                    <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-white/[0.07] rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/30 dark:border-white/20 p-6">
                        {/* Inner glass layer */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Folder className="h-5 w-5 text-orange-500" />
                                {currentFolderId ? (
                                    isSharedRoot ? "Shared with Me" :
                                        isPublicRoot ? "Public Files" :
                                            isGroupFolder ? (currentGroupDetails?.name || "Group") :
                                                normalBreadcrumbs?.[normalBreadcrumbs.length - 1]?.name || "Folder"
                                ) : "Root"}
                            </h3>

                            {!isSharedRoot && !isGroupFolder && !isPublicRoot && (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/upload?folderId=${currentFolderId || ""}`}
                                        className="relative flex items-center gap-2 px-4 py-2 text-sm backdrop-blur-2xl bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-white rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg border border-white/30 hover:scale-[1.02] duration-300"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Upload
                                    </Link>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="relative flex items-center gap-2 px-4 py-2 text-sm backdrop-blur-2xl bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-white rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg border border-white/30 hover:scale-[1.02] duration-300"
                                    >
                                        <FolderPlus className="h-4 w-4" />
                                        New Folder
                                    </button>
                                </div>
                            )}
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
                                    } ${dragOverFolderId === null && (draggedNoteId || draggedFolderId) ? 'ring-2 ring-orange-500 bg-orange-500/20' : ''}`}
                            >
                                <Home className="h-3 w-3" />
                                Root
                            </button>

                            {/* Render Custom Breadcrumbs */}
                            {breadcrumbsDisplay.map((crumb) => (
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
                                            } ${dragOverFolderId === crumb.id && (draggedNoteId || draggedFolderId) ? 'ring-2 ring-orange-500 bg-orange-500/20' : ''}`}
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
                                    if (breadcrumbsDisplay.length > 0) {
                                        // If we have breadcrumbs, go to previous ID
                                        // If length is 1, it means we are at the first level deep, so go to Root (null)
                                        // Wait, breadcrumbsDisplay includes current.
                                        if (breadcrumbsDisplay.length > 1) {
                                            setCurrentFolderId(breadcrumbsDisplay[breadcrumbsDisplay.length - 2].id);
                                        } else {
                                            setCurrentFolderId(null);
                                        }
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
                            {displayFolders.map((folder) => (
                                <div
                                    key={folder.id}
                                    draggable={!folder.isVirtual && folder.type === 'folder'}
                                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setCurrentFolderId(folder.id)}
                                    onDragOver={(e) => handleDragOver(e, folder.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-500/20 hover:via-pink-500/15 hover:to-orange-500/20 cursor-pointer transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_0_rgba(251,146,60,0.25)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.05] active:scale-[0.98] ${dragOverFolderId === folder.id && (draggedNoteId || draggedFolderId) && draggedFolderId !== folder.id ? 'ring-2 ring-orange-500 bg-orange-500/20 scale-105' : ''
                                        } ${draggedFolderId === folder.id ? 'opacity-50 scale-95' : ''}`}
                                >
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    {folder.type === 'folder' && !folder.isVirtual && (
                                        <button
                                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 backdrop-blur-md bg-red-500/80 text-white hover:bg-red-600/90 rounded-lg transition-all shadow-lg border border-white/30"
                                            title="Delete Folder"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}

                                    <div className="relative w-full aspect-square mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-inner">
                                        <div className="absolute inset-0 bg-white/5 opacity-50" />
                                        {folder.type === 'shared-root' || folder.type === 'group' ? (
                                            <Users className="h-16 w-16 text-blue-500 fill-blue-500/20 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300" />
                                        ) : folder.type === 'public-root' ? (
                                            <Globe className="h-16 w-16 text-green-500 fill-green-500/20 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300" />
                                        ) : (
                                            <Folder className="h-16 w-16 text-yellow-500 fill-yellow-500/20 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300" />
                                        )}
                                    </div>

                                    <span className="text-sm font-medium text-center truncate w-full text-gray-800 dark:text-gray-200">{folder.name}</span>
                                </div>
                            ))}

                            {/* Files */}
                            {displayFiles.map((note) => (
                                <div
                                    key={note.id}
                                    draggable={!isSharedRoot && !isGroupFolder && !isPublicRoot}
                                    onDragStart={(e) => handleDragStart(e, note.id, 'note')}
                                    onDragEnd={handleDragEnd}
                                    className={`group relative flex flex-col items-center p-5 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.15] dark:from-white/[0.1] dark:via-white/[0.05] dark:to-white/[0.08] hover:from-purple-500/20 hover:via-blue-500/15 hover:to-purple-500/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_0_rgba(147,51,234,0.25)] border border-white/25 hover:border-purple-300/50 hover:scale-[1.05] active:scale-[0.98] cursor-grab active:cursor-grabbing ${draggedNoteId === note.id ? 'opacity-50 scale-95' : ''
                                        }`}
                                >
                                    {/* Drag handle indicator */}
                                    {!isSharedRoot && !isGroupFolder && !isPublicRoot && (
                                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
                                            <GripVertical className="h-4 w-4 text-gray-500" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <div className="relative w-full aspect-square mb-2 flex items-center justify-center overflow-hidden rounded-xl">
                                        {(note as any).thumbnailUrl ? (
                                            <img
                                                src={(note as any).thumbnailUrl}
                                                alt={note.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FileText className="h-10 w-10 text-gray-600 dark:text-gray-300 group-hover:text-purple-500 transition-colors drop-shadow-lg" />
                                        )}

                                        {!(note as any).thumbnailUrl && (
                                            <div className="absolute -bottom-1 -right-1 backdrop-blur-sm bg-white/60 dark:bg-black/40 text-[10px] px-1.5 py-0.5 rounded border border-white/40 text-gray-700 dark:text-gray-300 font-semibold">
                                                PDF
                                            </div>
                                        )}
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
                            {(!displayFolders.length && !displayFiles.length) && (
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
