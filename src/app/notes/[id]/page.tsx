"use client";

import { use, useState, useEffect, useCallback } from "react";
import { api } from "@/app/_trpc/client";
import { InteractionsPanel } from "@/components/InteractionsPanel";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Maximize2, Eye } from "lucide-react";

// Dynamically import PDF components with SSR disabled to avoid "DOMMatrix is not defined" error
const PdfViewer = dynamic(() => import("@/components/PdfViewer").then(mod => mod.PdfViewer), {
    ssr: false,
    loading: () => <div className="animate-pulse h-[600px] bg-gray-100 dark:bg-zinc-800 rounded-xl" />
});

const FullPageNoteViewer = dynamic(() => import("@/components/FullPageNoteViewer").then(mod => mod.FullPageNoteViewer), {
    ssr: false
});

import { useRouter } from "next/navigation";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const { data: currentUser } = api.auth.getMe.useQuery();
    const [pageNum, setPageNum] = useState(1);
    const [isFullPageOpen, setIsFullPageOpen] = useState(false);
    const trackViewMutation = api.notes.trackView.useMutation();
    const [getPageImage, setGetPageImage] = useState<(() => string | null) | undefined>();

    // Callback to receive the canvas image capture function from PdfViewer
    const handleCanvasReady = useCallback((getImageFn: () => string | null) => {
        setGetPageImage(() => getImageFn);
    }, []);

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
    const s3Url = note.fileUrl; // Use presigned URL from API

    return (
        <>
            <div className="min-h-screen p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back</button>
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
                                <Link href={`/notes/${note.id}/edit`} className="px-4 py-2 rounded-lg text-gray-800 dark:text-gray-200 relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95]">
                                    Edit Note
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Focus Mode Button - Desktop Only */}
                    {s3Url && (
                        <div className="hidden md:flex justify-end mb-4">
                            <button
                                onClick={() => setIsFullPageOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-gray-800 dark:text-gray-200 relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95]"
                                title="Open in Focus Mode"
                            >
                                <Maximize2 className="w-5 h-5" />
                                <span>Focus Mode</span>
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        <div className="flex-1 w-full">
                            {s3Url ? (
                                <PdfViewer
                                    url={s3Url}
                                    pageNum={pageNum}
                                    onPageChange={setPageNum}
                                    onDoubleClick={() => setIsFullPageOpen(true)}
                                    noteId={note?.id}
                                    versionId={currentVersion?.id}
                                    onCanvasReady={handleCanvasReady}
                                />
                            ) : (
                                <div className="p-8 border text-center text-red-500">
                                    Could not load PDF version.
                                </div>
                            )}
                        </div>

                        {currentVersion && (
                            <div className="shrink-0 w-full lg:w-[350px]">
                                <InteractionsPanel
                                    versionId={currentVersion.id}
                                    pageNumber={pageNum}
                                    getPageImage={getPageImage}
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
                    initialPage={pageNum}
                    isOpen={isFullPageOpen}
                    onClose={() => setIsFullPageOpen(false)}
                    noteTitle={note?.title || ""}
                    versionId={note?.currentVersionId || ""}
                />
            )}
        </>
    );
}
