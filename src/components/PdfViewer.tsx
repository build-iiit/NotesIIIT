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


    // 3. Render Page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;

            // Cancel previous render if any
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            try {
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
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
                    // Don't set error on cancel
                    setError("Failed to render page");
                }
            }
        };

        renderPage();
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
    const { data: bookmarks, refetch: refetchBookmarks, error: bookmarksError } = api.bookmarks.getForNote.useQuery(
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

            {/* Controls */}
            <div className="space-y-4">
                {/* Navigation and Page Jump */}
                <div className="flex gap-4 items-center justify-center flex-wrap">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={pageNum <= 1}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
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
                            placeholder="Page #"
                            min={1}
                            max={pdfDoc?.numPages}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-zinc-700 rounded text-center bg-white dark:bg-zinc-800"
                        />
                        <button
                            onClick={handlePageJump}
                            className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded transition-colors text-sm"
                        >
                            Go
                        </button>
                    </div>

                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        Page {pageNum} of {pdfDoc?.numPages || "--"}
                    </span>

                    <button
                        onClick={() => changePage(1)}
                        disabled={!pdfDoc || pageNum >= (pdfDoc.numPages || 0)}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
                    >
                        Next
                    </button>

                    {/* Bookmark Button */}
                    {noteId && (
                        <button
                            onClick={handleToggleBookmark}
                            disabled={toggleBookmarkMutation.isPending}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            title={isCurrentPageBookmarked ? "Remove bookmark (B)" : "Bookmark this page (B)"}
                        >
                            {isCurrentPageBookmarked ? (
                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            ) : (
                                <Star className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Bookmarks List */}
                {noteId && bookmarks && bookmarks.length > 0 && (
                    <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Bookmark className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Bookmarks ({bookmarks.length})
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {bookmarks.map((bookmark: { id: string; pageNumber: number }) => (
                                <button
                                    key={bookmark.id}
                                    onClick={() => onPageChange(bookmark.pageNumber)}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${bookmark.pageNumber === pageNum
                                        ? "bg-blue-500 text-white"
                                        : "bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-600"
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
