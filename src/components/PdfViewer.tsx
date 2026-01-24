"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Star, Bookmark } from "lucide-react";
import { api } from "@/app/_trpc/client";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    pageNum: number;
    onPageChange: (page: number) => void;
    noteId?: string; // Optional for backward compatibility
}

export function PdfViewer({ url, pageNum, onPageChange, noteId }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [scale, setScale] = useState(1.0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

    // 1. Load PDF Document
    useEffect(() => {
        const loadPdf = async () => {
            try {
                setLoading(true);
                const loadingTask = pdfjsLib.getDocument(url);
                const doc = await loadingTask.promise;
                setPdfDoc(doc);
                setLoading(false);
            } catch (err) {
                console.error("Error loading PDF:", err);
                setError("Failed to load PDF");
                setLoading(false);
            }
        };

        if (url) {
            loadPdf();
        }
    }, [url]);

    // 2. Calculate scale based on container width
    const updateScale = useCallback(async (availableWidth: number) => {
        if (!pdfDoc) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const newScale = (availableWidth - 32) / viewport.width; // -32 for padding
            setScale(newScale);
        } catch (e) {
            console.error(e);
        }
    }, [pdfDoc, pageNum]);

    // 3. Handle Responsive Scaling
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    // Logic: we want the PDF to fit width-wise, but maybe cap zooming
                    // For now, let's just trigger a re-render by updating scale or invalidating
                    // Ideally we calculate the scale based on page width here, 
                    // but we need the page object first.
                    // So we trigger a redraw.
                    // Let's set a "containerWidth" state if specific logic is needed, 
                    // or just force update execution in render effect.
                    updateScale(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [pdfDoc, pageNum, updateScale]); // Depend on doc/page to recalculate when they change


    // 3. Render Page - with proper cancellation handling
    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;

            // Cancel previous render if any
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                    await renderTaskRef.current.promise;
                } catch {
                    // Cancelled renders throw, which is expected
                }
                renderTaskRef.current = null;
            }

            // Check if we were cancelled while waiting
            if (cancelled) return;

            try {
                const page = await pdfDoc.getPage(pageNum);
                if (cancelled) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext("2d");
                if (!context) return;

                // Set dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== "RenderingCancelledException") {
                    console.error("Error rendering page:", err);
                    if (!cancelled) {
                        setError("Failed to render page");
                    }
                }
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [pdfDoc, pageNum, scale]);

    const changePage = useCallback((offset: number) => {
        if (!pdfDoc) return;
        onPageChange(Math.min(Math.max(pageNum + offset, 1), pdfDoc.numPages));
    }, [pageNum, pdfDoc, onPageChange]);

    // Page jump state and handler
    const [pageJumpInput, setPageJumpInput] = useState("");

    const handlePageJump = useCallback(() => {
        const targetPage = parseInt(pageJumpInput, 10);
        if (pdfDoc && !isNaN(targetPage) && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
            onPageChange(targetPage);
            setPageJumpInput("");
        }
    }, [pageJumpInput, pdfDoc, onPageChange]);

    // Bookmark functionality
    const { data: bookmarks, refetch: refetchBookmarks } = api.bookmarks.getForNote.useQuery(
        { noteId: noteId! },
        { enabled: !!noteId }
    );

    const toggleBookmarkMutation = api.bookmarks.toggle.useMutation({
        onSuccess: (result) => {
            console.log('Bookmark toggled:', result);
            refetchBookmarks();
        },
        onError: (error) => {
            console.error('Bookmark error:', error);
            alert('Failed to toggle bookmark. Please make sure you are logged in.');
        },
    });

    const isCurrentPageBookmarked = bookmarks?.some((b: { pageNumber: number }) => b.pageNumber === pageNum);

    const handleToggleBookmark = useCallback(() => {
        if (!noteId) {
            console.warn('No noteId provided');
            return;
        }
        console.log('Toggling bookmark for page:', pageNum, 'noteId:', noteId);
        toggleBookmarkMutation.mutate({
            noteId,
            pageNumber: pageNum,
        });
    }, [noteId, pageNum, toggleBookmarkMutation]);

    // Keyboard navigation for arrow keys and bookmark
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowLeft":
                    e.preventDefault();
                    changePage(-1);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    changePage(1);
                    break;
                case "b":
                case "B":
                    e.preventDefault();
                    handleToggleBookmark();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [changePage, handleToggleBookmark]);

    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
            {loading && <div>Loading PDF...</div>}

            <div className="border border-gray-200 shadow-lg rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                <canvas ref={canvasRef} className="max-w-full" />
            </div>

            {/* Controls - Liquid Glass Theme */}
            <div className="space-y-4">
                {/* Navigation and Page Jump */}
                <div className="flex gap-3 items-center justify-center flex-wrap backdrop-blur-xl bg-white/30 dark:bg-black/30 rounded-2xl p-4 border border-white/20 dark:border-white/10 shadow-lg">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={pageNum <= 1}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 backdrop-blur-3xl bg-gradient-to-br from-white/40 via-white/20 to-white/30 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-300 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-white/30 dark:border-white/15 hover:border-orange-300/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Previous
                    </button>

                    {/* Page Jump Input */}
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={pageJumpInput}
                            onChange={(e) => setPageJumpInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
                            placeholder="Page"
                            min={1}
                            max={pdfDoc?.numPages}
                            className="w-20 px-3 py-2 rounded-xl text-center text-sm backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/30 dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/50 text-gray-800 dark:text-gray-200 placeholder-gray-500"
                        />
                        <button
                            onClick={handlePageJump}
                            className="px-3 py-2 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/30 dark:border-white/15 hover:bg-white/50 dark:hover:bg-white/10 transition-all"
                        >
                            Go
                        </button>
                    </div>

                    <span className="font-medium text-gray-800 dark:text-gray-200 px-3">
                        Page {pageNum} of {pdfDoc?.numPages || "--"}
                    </span>

                    <button
                        onClick={() => changePage(1)}
                        disabled={!pdfDoc || pageNum >= (pdfDoc.numPages || 0)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 backdrop-blur-3xl bg-gradient-to-br from-white/40 via-white/20 to-white/30 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-300 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-white/30 dark:border-white/15 hover:border-orange-300/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Next
                    </button>

                    {/* Bookmark Button */}
                    {noteId && (
                        <button
                            onClick={handleToggleBookmark}
                            disabled={toggleBookmarkMutation.isPending}
                            className="p-2 rounded-xl backdrop-blur-xl bg-white/40 dark:bg-black/30 border border-white/30 dark:border-white/15 hover:bg-white/50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                            title={isCurrentPageBookmarked ? "Remove bookmark (B)" : "Bookmark this page (B)"}
                        >
                            {isCurrentPageBookmarked ? (
                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            ) : (
                                <Star className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Bookmarks List */}
                {noteId && bookmarks && bookmarks.length > 0 && (
                    <div className="backdrop-blur-xl bg-white/30 dark:bg-black/30 rounded-2xl p-4 border border-white/20 dark:border-white/10 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <Bookmark className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                Bookmarks ({bookmarks.length})
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {bookmarks.map((bookmark: { id: string; pageNumber: number }) => (
                                <button
                                    key={bookmark.id}
                                    onClick={() => onPageChange(bookmark.pageNumber)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${bookmark.pageNumber === pageNum
                                        ? "bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white shadow-lg"
                                        : "backdrop-blur-xl bg-white/40 dark:bg-black/30 text-gray-700 dark:text-gray-300 border border-white/30 dark:border-white/15 hover:bg-white/50 dark:hover:bg-white/10"
                                        }`}
                                >
                                    Page {bookmark.pageNumber}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
