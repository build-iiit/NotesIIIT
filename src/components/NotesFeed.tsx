"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/_trpc/client";
import { FileText, ArrowRight, Upload } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useSession } from "next-auth/react";
import { SaveToFiles } from "./SaveToFiles";
import { Draggable } from "@/components/dnd/Draggable";

export function NotesFeed() {
    const { data: session } = useSession();
    const [sort, setSort] = useState<"popular" | "newest">("newest");
    const [displayCount, setDisplayCount] = useState(10);

    const { data, isLoading } = api.notes.getAll.useQuery({
        cursor: undefined,
        limit: 100 // Load more at once
    });

    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && data?.items && displayCount < data.items.length) {
            setDisplayCount(prev => prev + 10);
        }
    }, [inView, data?.items, displayCount]);

    // Client-side sorting
    const sortedNotes = (data?.items || []).sort((a: { voteScore?: number; createdAt: Date | string }, b: { voteScore?: number; createdAt: Date | string }) => {
        if (sort === "popular") {
            return (b.voteScore || 0) - (a.voteScore || 0);
        } else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    // Display subset
    const allNotes = sortedNotes.slice(0, displayCount);

    if (isLoading) {
        return <div className="text-sm text-muted-foreground py-10">Loading notes...</div>;
    }

    if (sortedNotes.length === 0 && !isLoading) {
        return (
            <div className="text-center py-16 border border-dashed border-border rounded-md">
                <p className="text-muted-foreground mb-4">No notes shared yet.</p>
                <Link href="/upload" className="text-primary hover:underline">
                    Be the first to upload
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    {sort === "popular" ? "Trending Uploads" : "Recent Uploads"}
                </h2>

                <div className="flex items-center gap-4">
                    <div className="flex bg-secondary p-1 rounded-md">
                        <button
                            onClick={() => setSort("popular")}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${sort === "popular"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Trending
                        </button>
                        <button
                            onClick={() => setSort("newest")}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${sort === "newest"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Recent
                        </button>
                    </div>
                    <Link
                        href="/upload"
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Upload className="h-3 w-3" />
                        Upload Note
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allNotes.map((note) => (
                    <Draggable key={note.id} id={note.id} data={{ type: "NOTE", note }}>
                        <Link
                            href={`/notes/${note.id}`}
                            className="group flex flex-col h-full border border-border bg-card rounded-md overflow-hidden hover:border-primary/30 transition-colors"
                        >
                            <div className="h-32 w-full relative bg-secondary border-b border-border flex items-center justify-center overflow-hidden">
                                {(note as any).thumbnailUrl || (note as any).versions?.[0]?.thumbnailKey ? (
                                    <img
                                        src={(note as any).thumbnailUrl || (note as any).versions?.[0]?.thumbnailKey}
                                        alt={`Thumbnail for ${note.title}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                                )}

                                {/* Overlay Badge */}
                                {note.course && (
                                    <span className="absolute top-2 right-2 text-[10px] font-mono text-secondary-foreground bg-secondary/90 px-1.5 py-0.5 rounded border border-border">
                                        {note.course.code}
                                    </span>
                                )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                    {note.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3">
                                    {(note as { author?: { name?: string } }).author?.name || "Unknown"} • {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                                {note.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">
                                        {note.description}
                                    </p>
                                )}
                                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                        Read <ArrowRight className="h-3 w-3" />
                                    </span>
                                    {/* Save to Files Button */}
                                    {session?.user?.id && session.user.id !== note.authorId && (
                                        <div onClick={(e) => e.preventDefault()}>
                                            <SaveToFiles noteId={note.id} noteTitle={note.title} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </Draggable>
                ))}
            </div>

            {displayCount < sortedNotes.length && (
                <div className="text-center py-4 text-xs text-muted-foreground">Loading more...</div>
            )}

            <div ref={ref} className="h-1" />
        </div>
    );
}
