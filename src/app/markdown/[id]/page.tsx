"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import dynamic from "next/dynamic";
import { Save, ArrowLeft, Loader2, Eye, Edit3, Trash2 } from "lucide-react";
import type { MarkdownDocument } from "@/types/markdownSchema";
import { EMPTY_DOCUMENT } from "@/types/markdownSchema";

// Dynamic import to avoid SSR issues with TipTap
const NotionEditor = dynamic(
    () => import("@/components/editor/NotionEditor").then((mod) => mod.NotionEditor),
    {
        ssr: false,
        loading: () => (
            <div className="animate-pulse h-[60vh] bg-gray-100 dark:bg-zinc-800 rounded-xl" />
        ),
    }
);

/**
 * View/Edit Markdown Note Page
 */
export default function MarkdownNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // Fetch note data
    const { data: note, isLoading, error } = api.markdownNotes.getById.useQuery({ id });
    const { data: currentUser } = api.auth.getMe.useQuery();

    // State
    const [content, setContent] = useState<MarkdownDocument>(EMPTY_DOCUMENT);
    const [title, setTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Update content mutation
    const updateContentMutation = api.markdownNotes.updateContent.useMutation({
        onSuccess: () => {
            setIsDirty(false);
        },
    });

    // Save mutation
    const saveMutation = api.markdownNotes.save.useMutation({
        onSuccess: () => {
            setIsDirty(false);
        },
    });

    // Update metadata mutation
    const updateMetadataMutation = api.markdownNotes.updateMetadata.useMutation();

    // Delete mutation
    const deleteMutation = api.markdownNotes.delete.useMutation({
        onSuccess: () => {
            router.push("/my-files");
        },
    });

    // Initialize state from fetched data
    useEffect(() => {
        if (note) {
            setContent((note.content as unknown as MarkdownDocument) || EMPTY_DOCUMENT);
            setTitle(note.title);
        }
    }, [note]);

    // Check if user is owner
    const isOwner = currentUser?.id === note?.authorId;

    // Navigation protection
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Autosave with debounce
    const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleContentChange = useCallback((newContent: MarkdownDocument) => {
        setContent(newContent);
        setIsDirty(true);

        // Clear existing timeout
        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }

        // Autosave after 3 seconds
        autosaveTimeoutRef.current = setTimeout(() => {
            updateContentMutation.mutate({
                id,
                content: newContent,
            });
        }, 3000);
    }, [id, updateContentMutation]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, []);

    // Save handler
    const handleSave = useCallback(async () => {
        setIsSaving(true);

        try {
            // Save content with new version
            await saveMutation.mutateAsync({
                id,
                content,
            });

            // Update title if changed
            if (title !== note?.title) {
                await updateMetadataMutation.mutateAsync({
                    id,
                    title,
                });
            }

            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    }, [id, content, title, note?.title, saveMutation, updateMetadataMutation]);

    // Keyboard shortcut for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (isOwner) handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, isOwner]);

    // Delete handler
    const handleDelete = useCallback(() => {
        if (window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
            deleteMutation.mutate({ id });
        }
    }, [id, deleteMutation]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Error or not found
    if (error || !note) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Note not found
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    This note may have been deleted or you don&apos;t have permission to view it.
                </p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <button
                        onClick={() => {
                            if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
                                return;
                            }
                            router.back();
                        }}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back</span>
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Mode indicator */}
                        {isOwner && (
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                            >
                                {isEditing ? (
                                    <>
                                        <Edit3 className="w-4 h-4" />
                                        Editing
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4" />
                                        Viewing
                                    </>
                                )}
                            </button>
                        )}

                        {/* Dirty indicator */}
                        {isDirty && isOwner && (
                            <span className="text-sm text-orange-500 font-medium">Unsaved</span>
                        )}

                        {/* Save button */}
                        {isOwner && isEditing && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save
                            </button>
                        )}

                        {/* Delete button */}
                        {isOwner && (
                            <button
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete note"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Author info */}
                <div className="flex items-center gap-3 mb-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>By {note.author?.name || "Unknown"}</span>
                    <span>•</span>
                    <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    {!isOwner && (
                        <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" /> Read-only
                            </span>
                        </>
                    )}
                </div>

                {/* Title */}
                {isOwner && isEditing ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setIsDirty(true);
                        }}
                        placeholder="Untitled"
                        className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 mb-8"
                    />
                ) : (
                    <h1 className="text-4xl font-bold mb-8">{title || "Untitled"}</h1>
                )}

                {/* Editor */}
                <NotionEditor
                    content={content}
                    onUpdate={isOwner && isEditing ? handleContentChange : undefined}
                    editable={isOwner && isEditing}
                    placeholder="This note is empty..."
                />
            </div>
        </div>
    );
}
