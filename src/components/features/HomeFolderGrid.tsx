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
 <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
 <div className="relative p-2 bg-primary/10 rounded-lg">
 <Folder className="h-6 w-6 text-primary" />
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
 <div className="relative flex flex-col items-center p-6 rounded-xl bg-card transition-all duration-200 border border-border hover:border-primary/50 hover:-translate-y-1 h-full justify-center hover:shadow-lg">
 {/* Folder Icon */}
 <div className="relative mb-4">
 <Folder className="h-16 w-16 group-hover:scale-105 transition-transform duration-300 text-primary fill-primary/20" />
 <div className="absolute -bottom-1 -right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
 {folder._count?.notes || 0}
 </div>
 </div>

 {/* Folder Name */}
 <span className="text-sm font-semibold text-center truncate w-full text-foreground transition-colors group-hover:text-primary">
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
