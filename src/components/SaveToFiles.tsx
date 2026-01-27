"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/app/_trpc/client";
import { Bookmark, Loader2, FolderInput, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface SaveToFilesProps {
    noteId: string;
    noteTitle: string;
}

export function SaveToFiles({ noteId, noteTitle }: SaveToFilesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; showAbove?: boolean }>({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();

    const utils = api.useUtils();
    const { data: allFoldersData } = api.folders.getAllFlat.useQuery();
    const cloneMutation = api.notes.clone.useMutation({
        onSuccess: () => {
            utils.notes.getAll.invalidate();
            utils.folders.getAll.invalidate();
            setIsOpen(false);
            alert("Note saved to your files!");
            router.refresh();
        },
        onError: (err) => {
            alert("Failed to save note: " + err.message);
        }
    });

    // Update dropdown position when opened or on scroll
    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const dropdownHeight = 300; // estimated max height
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;

                // Position above if not enough space below
                const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

                setDropdownPosition({
                    top: showAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                    left: Math.max(8, rect.right - 256), // 256 = dropdown width, 8 = min margin
                    showAbove
                });
            }
        };

        updatePosition();

        if (isOpen) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    // Simple folder tree flattener or just list sorting
    const folderOptions = allFoldersData?.sort((a, b) => a.name.localeCompare(b.name)) || [];

    if (cloneMutation.status === "pending") {
        return (
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500/50 rounded-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
            </button>
        );
    }

    const dropdown = isOpen && typeof window !== 'undefined' ? createPortal(
        <>
            <div
                className="fixed inset-0 z-[9998]"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                }}
            />
            <div
                className="fixed w-64 backdrop-blur-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 z-[9999] p-3 animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    maxHeight: dropdownPosition.showAbove ? dropdownPosition.top + 300 - 16 : `calc(100vh - ${dropdownPosition.top + 16}px)`
                }}
            >
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 px-2 uppercase tracking-wider">
                    Choose Folder
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 overscroll-contain">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTargetFolderId(null);
                            cloneMutation.mutate({ noteId, targetFolderId: undefined });
                        }}
                        className="w-full text-left px-3 py-2.5 text-sm rounded-lg bg-orange-50 dark:bg-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/30 text-orange-700 dark:text-orange-300 flex items-center gap-2 transition-colors border border-orange-200 dark:border-orange-500/30 font-medium"
                    >
                        <FolderInput className="h-4 w-4" />
                        <span>My Files (Root)</span>
                    </button>

                    {folderOptions.length > 0 && <div className="h-px bg-gray-200 dark:bg-zinc-700 my-2 mx-2" />}

                    {folderOptions.map(folder => (
                        <button
                            key={folder.id}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTargetFolderId(folder.id);
                                cloneMutation.mutate({ noteId, targetFolderId: folder.id });
                            }}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 truncate pl-4 flex items-center gap-2 transition-colors"
                        >
                            <span className="text-base">📂</span>
                            <span className="truncate">{folder.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>,
        document.body
    ) : null;

    return (
        <div className="relative inline-block text-left">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 rounded-lg transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105 active:scale-95"
                title="Save to My Files"
            >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save Note</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdown}
        </div>
    );
}
