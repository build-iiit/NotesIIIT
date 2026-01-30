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

import { useThemeStyle } from "@/components/ThemeStyleProvider";

export function HomeFolderGrid({ folders }: HomeFolderGridProps) {
    const { themeStyle } = useThemeStyle();
    if (!folders || folders.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-6xl">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="relative">
                        <Folder className={`h-7 w-7 drop-shadow-lg ${themeStyle === "monochrome" ? "text-primary" : "text-orange-500"}`} />
                        <div className={`absolute inset-0 blur-xl rounded-full ${themeStyle === "monochrome" ? "bg-primary/30" : "bg-orange-500/30"}`} />
                    </div>
                    Your Folders
                </h2>
            </div>

            {/* Folder Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {folders.slice(0, 10).map((folder) => (
                    <Draggable key={folder.id} id={folder.id} data={{ type: "FOLDER", folder }} className="h-full">
                        <Droppable id={folder.id} data={{ type: "FOLDER", folder }} className="h-full">
                            <Link
                                href={`/my-files?folderId=${folder.id}`}
                                className="group relative block h-full"
                            >
                                {/* iOS-Style Glass Folder Card */}
                                <div className={`relative flex flex-col items-center p-6 rounded-2xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] border border-white/25 hover:scale-[1.08] active:scale-[0.95] cursor-pointer h-full justify-center ${themeStyle === 'monochrome'
                                    ? 'hover:bg-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5'
                                    : 'hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] hover:border-orange-300/50'
                                    }`}>
                                    {/* Inner glow layer */}
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    {/* Folder Icon */}
                                    <div className="relative mb-4">
                                        <Folder className={`h-20 w-20 drop-shadow-xl group-hover:scale-110 transition-transform duration-300 ${themeStyle === "monochrome" ? "text-primary fill-primary/30" : "text-yellow-500 fill-yellow-500/30"}`} />
                                        <div className={`absolute -bottom-1 -right-2 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg border-2 ${themeStyle === "monochrome" ? "bg-white text-black dark:bg-zinc-800 dark:text-white border-zinc-200 dark:border-zinc-700" : "bg-gradient-to-br from-orange-500 to-pink-500 text-white border-white"}`}>
                                            {folder._count?.notes || 0}
                                        </div>
                                    </div>

                                    {/* Folder Name */}
                                    <span className={`text-sm font-semibold text-center truncate w-full text-gray-800 dark:text-gray-200 transition-colors relative z-10 ${themeStyle === "monochrome" ? "group-hover:text-primary" : "group-hover:text-orange-600 dark:group-hover:text-orange-400"}`}>
                                        {folder.name}
                                    </span>

                                    {/* Hover Arrow Indicator */}
                                    <ChevronRight className={`h-4 w-4 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${themeStyle === "monochrome" ? "text-primary" : "text-orange-500"}`} />
                                </div>
                            </Link>
                        </Droppable>
                    </Draggable>
                ))}
            </div>
        </div>
    );
}
