"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import dynamic from "next/dynamic";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
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
 * Create New Markdown Note Page
 */
export default function NewMarkdownNotePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState<MarkdownDocument>(EMPTY_DOCUMENT);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [noteId, setNoteId] = useState<string | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Create mutation
    const createMutation = api.markdownNotes.create.useMutation({
        onSuccess: (data) => {
            setNoteId(data.id);
            setIsDirty(false);
        },
    });

    // Update content mutation for autosave
    const updateContentMutation = api.markdownNotes.updateContent.useMutation({
        onSuccess: () => {
            setIsDirty(false);
        },
    });

    // Focus title on mount
    useEffect(() => {
        titleInputRef.current?.focus();
    }, []);

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

        // If we have a note ID, autosave after 3 seconds
        if (noteId) {
            autosaveTimeoutRef.current = setTimeout(() => {
                updateContentMutation.mutate({
                    id: noteId,
                    content: newContent,
                });
            }, 3000);
        }
    }, [noteId, updateContentMutation]);

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
        if (!title.trim()) {
            titleInputRef.current?.focus();
            return;
        }

        setIsSaving(true);

        try {
            if (noteId) {
                // Update existing note
                await updateContentMutation.mutateAsync({
                    id: noteId,
                    content,
                    createNewVersion: true,
                });
            } else {
                // Create new note
                const newNote = await createMutation.mutateAsync({
                    title: title.trim(),
                    content,
                });
                setNoteId(newNote.id);
                // Navigate to the created note
                router.push(`/markdown/${newNote.id}`);
            }
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    }, [title, content, noteId, createMutation, updateContentMutation, router]);

    // Keyboard shortcut for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

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
                        {isDirty && (
                            <span className="text-sm text-orange-500 font-medium">Unsaved changes</span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {noteId ? "Save" : "Create Note"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Title Input */}
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

                {/* Editor */}
                <NotionEditor
                    content={content}
                    onUpdate={handleContentChange}
                    editable={true}
                    placeholder="Start writing, or press '/' for commands..."
                />
            </div>
        </div>
    );
}
