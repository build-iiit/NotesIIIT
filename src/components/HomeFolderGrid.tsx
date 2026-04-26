"use client";

import Link from "next/link";
import { Folder, ChevronRight } from "lucide-react";
import { Droppable } from "@/components/dnd/Droppable";
import { Draggable } from "@/components/dnd/Draggable";

interface FolderType {
    id: string;
    name: string;
    userId: string;
    _count?: {
        notes: number;
    };
}

interface HomeFolderGridProps {
    folders: FolderType[];
}

export function HomeFolderGrid({ folders }: HomeFolderGridProps) {
    if (!folders || folders.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    Your Folders
                </h2>
                <Link href="/my-files" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    View all <ChevronRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Folder Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {folders.slice(0, 10).map((folder) => (
                    <Draggable key={folder.id} id={folder.id} data={{ type: "FOLDER", folder }} className="h-full">
                        <Droppable id={folder.id} data={{ type: "FOLDER", folder }} className="h-full">
                            <Link
                                href={`/my-files?folderId=${folder.id}`}
                                className="group flex flex-col items-start p-4 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors h-full"
                            >
                                {/* Folder Icon & Count */}
                                <div className="flex items-start justify-between w-full mb-3">
                                    <Folder className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                        {folder._count?.notes || 0}
                                    </span>
                                </div>

                                {/* Folder Name */}
                                <span className="text-sm font-medium text-foreground truncate w-full">
                                    {folder.name}
                                </span>
                            </Link>
                        </Droppable>
                    </Draggable>
                ))}
            </div>
        </div>
    );
}
