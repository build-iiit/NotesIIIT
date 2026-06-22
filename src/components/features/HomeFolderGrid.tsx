"use client";

import Link from"next/link";
import { Folder, ChevronRight } from"lucide-react";
import { Droppable } from"@/components/dnd/Droppable";
import { Draggable } from"@/components/dnd/Draggable";

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
 <div className="w-full max-w-6xl">
 {/* Section Header */}
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
 <div className="relative">
 <Folder className="h-7 w-7 drop-shadow-lg text-primary" />
 <div className="absolute inset-0 blur-xl rounded-full bg-primary/30" />
 </div>
 Your Folders
 </h2>
 </div>

 {/* Folder Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
 {folders.slice(0, 10).map((folder) => (
 <Draggable key={folder.id} id={folder.id} data={{ type:"FOLDER", folder }} className="h-full">
 <Droppable id={folder.id} data={{ type:"FOLDER", folder }} className="h-full">
 <Link
 href={`/my-files?folderId=${folder.id}`}
 className="group relative block h-full"
 >
 {/* iOS-Style Glass Folder Card */}
 <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] border border-white/25 hover:scale-[1.08] active:scale-[0.95] cursor-pointer h-full justify-center hover:bg-primary/5 hover:border-primary/50 hover:shadow-[0_16px_40px_0_var(--glow-color)]">
 {/* Inner glow layer */}
 <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

 {/* Folder Icon */}
 <div className="relative mb-4">
 <Folder className="h-20 w-20 drop-shadow-xl group-hover:scale-110 transition-transform duration-300 text-primary fill-primary/25" />
 <div className="absolute -bottom-1 -right-2 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg border-2 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white border-white dark:border-zinc-900">
 {folder._count?.notes || 0}
 </div>
 </div>

 {/* Folder Name */}
 <span className="text-sm font-semibold text-center truncate w-full text-gray-800 dark:text-gray-200 transition-colors relative z-10 group-hover:text-primary">
 {folder.name}
 </span>

 {/* Hover Arrow Indicator */}
 <ChevronRight className="h-4 w-4 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-primary" />
 </div>
 </Link>
 </Droppable>
 </Draggable>
 ))}
 </div>
 </div>
 );
}
