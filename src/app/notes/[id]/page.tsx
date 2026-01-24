"use client";

import { use, useState, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { PdfViewer } from "@/components/PdfViewer";
import { InteractionsPanel } from "@/components/InteractionsPanel";
import { FullPageNoteViewer } from "@/components/FullPageNoteViewer";
import Link from "next/link";
import { Maximize2, Eye } from "lucide-react";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const { data: currentUser } = api.auth.getMe.useQuery();
    const [pageNum, setPageNum] = useState(1);
    const [isFullPageOpen, setIsFullPageOpen] = useState(false);
    const trackViewMutation = api.notes.trackView.useMutation();

    // Track view when the note is loaded
    useEffect(() => {
        if (note?.id) {
            // Track view in background without updating the UI immediately
            // The updated count will show on next page load
            trackViewMutation.mutate({ noteId: note.id });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [note?.id]); // Only track on initial load

    if (!note) return <div>Note not found</div>;

    // Find current version
    const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];
    let s3Url = currentVersion?.s3Key;
    if (s3Url && !s3Url.startsWith("http") && !s3Url.startsWith("/")) {
        s3Url = `/${s3Url}`;
    }

    return (
        <>
            <div className="min-h-screen p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
                            <h1 className="text-3xl font-bold">{note.title}</h1>
                            <p className="text-gray-500 flex items-center gap-2">
                                <span>By {note.author.name} • Version {currentVersion?.version}</span>
                                <span className="flex items-center gap-1">
                                    • <Eye className="w-4 h-4" /> {note.viewCount}
                                </span>
                            </p>
                            {note.description && <p className="mt-2 text-lg">{note.description}</p>}
                        </div>
                        <div className="flex gap-4">
                            {/* Only show Edit button if user owns the note */}
                            {currentUser?.id === note.authorId && (
                                <Link href={`/notes/${note.id}/edit`} className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                                    Edit Note
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Focus Mode Button */}
                    {s3Url && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setIsFullPageOpen(true)}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                                title="Open in Focus Mode"
                            >
                                <Maximize2 className="w-5 h-5" />
                                <span>Focus Mode</span>
                            </button>
                        </div>
                    )}

                    <div className="flex gap-8 items-start">
                        <div className="flex-1">
                            {s3Url ? (
                                <PdfViewer
                                    url={s3Url}
                                    pageNum={pageNum}
                                    onPageChange={setPageNum}
                                    noteId={note?.id}
                                    versionId={currentVersion?.id}
                                />
                            ) : (
                                <div className="p-8 border text-center text-red-500">
                                    Could not load PDF version.
                                </div>
                            )}
                        </div>

                        {currentVersion && (
                            <div className="shrink-0">
                                <InteractionsPanel
                                    versionId={currentVersion.id}
                                    pageNumber={pageNum}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Full Page Viewer */}
            {s3Url && (
                <FullPageNoteViewer
                    url={s3Url}
                    initialPage={1}
                    isOpen={isFullPageOpen}
                    onClose={() => setIsFullPageOpen(false)}
                    noteTitle={note.title}
                    versionId={note.currentVersionId || ""}
                />
            )}
        </>
    );
}
