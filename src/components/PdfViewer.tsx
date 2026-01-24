"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Star, Bookmark, X, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { TextNoteOverlay } from "./annotations/TextNoteOverlay";
import { Point, Stroke, TextNote, PageAnnotations } from "./annotations/types";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    pageNum: number;
    onPageChange: (page: number) => void;
    noteId?: string; // Optional for backward compatibility
    versionId?: string;
}

export function PdfViewer({ url, pageNum, onPageChange, noteId, versionId }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [scale, setScale] = useState(1.0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
    const [viewportDimensions, setViewportDimensions] = useState<{ width: number, height: number } | null>(null);
    const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
    const [textNotes, setTextNotes] = useState<Record<number, TextNote[]>>({});

    // Fetch annotations
    const { data: savedAnnotations } = api.notes.getAnnotations.useQuery(
        { versionId: versionId || "" },
        { enabled: !!versionId }
    );

    useEffect(() => {
        if (savedAnnotations) {
            const parsed = savedAnnotations as unknown as Record<number, PageAnnotations>;
            const textNotesData: Record<number, TextNote[]> = {};
            const strokesData: Record<number, Stroke[]> = {};

            Object.entries(parsed).forEach(([pNum, data]) => {
                const pageNumInt = parseInt(pNum);
                if (data.textNotes) {
                    textNotesData[pageNumInt] = data.textNotes;
                }
                if (data.strokes) {
                    strokesData[pageNumInt] = data.strokes;
                }
            });
            setTextNotes(textNotesData);
            setAnnotations(strokesData);
        }
    }, [savedAnnotations]);

    const renderAnnotations = useCallback((viewport: pdfjsLib.PageViewport) => {
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pageStrokes = annotations[pageNum] || [];
        pageStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width || (stroke.type === "highlighter" ? 15 : 2);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = stroke.type === "highlighter" ? 0.3 : 1;

            const firstPoint = stroke.points[0];
            ctx.moveTo(firstPoint.x * viewport.width, firstPoint.y * viewport.height);

            stroke.points.slice(1).forEach(p => {
                ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
            });
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }, [annotations, pageNum]);

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
                    updateScale(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [pdfDoc, pageNum, updateScale]);


    // 3. Render Page
    useEffect(() => {
        let isCancelled = false;

        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;

            // Strict Cancellation
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // Ignore cancellation errors
                }
                renderTaskRef.current = null;
            }

            if (isCancelled) return;

            try {
                const page = await pdfDoc.getPage(pageNum);
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
                setViewportDimensions({ width: viewport.width, height: viewport.height });

                // Draw annotations
                renderAnnotations(viewport);
            } catch (err: unknown) {
                // Check if it's a cancellation error (which might not be an Error instance but usually is)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isCancelledError = err && typeof err === 'object' && 'name' in err && (err as any).name === "RenderingCancelledException";

                if (!isCancelledError && !isCancelled) {
                    if (err instanceof Error && err.name !== "RenderingCancelledException") {
                        console.error("Error rendering page:", err);
                    }
                }
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // ignore
                }
            }
        };
    }, [pdfDoc, pageNum, scale, renderAnnotations]);

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

    // Unique ID for canvas to force remount on ANY change
    const canvasKey = `${pdfDoc?.fingerprints?.[0] || 'doc'}-${pageNum}-${scale}`;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
            {loading && <div>Loading PDF...</div>}

            <div className="relative border border-gray-200 shadow-lg rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                <canvas
                    ref={canvasRef}
                    key={canvasKey}
                    className="max-w-full"
                />
                <canvas
                    ref={annotationCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: viewportDimensions?.width, height: viewportDimensions?.height }}
                />

                {/* Text Notes Overlay (Read-Only) */}
                {viewportDimensions && textNotes[pageNum]?.map(note => (
                    <TextNoteOverlay
                        key={note.id}
                        note={note}
                        viewportDimensions={viewportDimensions}
                        isEditing={false}
                        onSave={() => { }}
                        onUpdate={() => { }}
                        onCancel={() => { }}
                        onClick={() => { }}
                        onDelete={() => { }}
                        onToggleCollapse={(id) => {
                            setTextNotes(prev => ({
                                ...prev,
                                [pageNum]: (prev[pageNum] || []).map(n =>
                                    n.id === id ? { ...n, collapsed: !n.collapsed } : n
                                )
                            }));
                        }}
                        readOnly={true}
                    />
                ))}
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
