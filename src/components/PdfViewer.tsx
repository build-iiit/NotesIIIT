"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Star, Bookmark, X, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { TextNoteOverlay } from "./annotations/TextNoteOverlay";
import { Point, Stroke, TextNote, PageAnnotations } from "./annotations/types";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    pageNum: number;
    onPageChange: (page: number) => void;
    onDoubleClick?: () => void;
    noteId?: string;
    versionId?: string;
}

export function PdfViewer({ url, pageNum, onPageChange, onDoubleClick, noteId, versionId }: PdfViewerProps) {
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

    // Fetch saved annotations from tRPC
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
                if (data.textNotes) textNotesData[pageNumInt] = data.textNotes;
                if (data.strokes) strokesData[pageNumInt] = data.strokes;
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
        if (url) loadPdf();
    }, [url]);

    // 2. Handle Responsive Scaling
    const updateScale = useCallback(async (availableWidth: number) => {
        if (!pdfDoc) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const newScale = (availableWidth - 32) / viewport.width;
            setScale(newScale);
        } catch (e) { console.error(e); }
    }, [pdfDoc, pageNum]);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) updateScale(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [pdfDoc, pageNum, updateScale]);

    // 3. Render Page with proper cancellation handling (The Fixed Merge)
    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;

            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                    await renderTaskRef.current.promise;
                } catch { }
                renderTaskRef.current = null;
            }

            if (cancelled) return;

            try {
                const page = await pdfDoc.getPage(pageNum);
                if (cancelled) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas?.getContext("2d");
                if (!canvas || !context) return;

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
                if (cancelled) return;

                setViewportDimensions({ width: viewport.width, height: viewport.height });
                renderAnnotations(viewport);
            } catch (err) {
                if (err instanceof Error && err.name !== "RenderingCancelledException") {
                    console.error("Error rendering page:", err);
                    if (!cancelled) setError("Failed to render page");
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
    }, [pdfDoc, pageNum, scale, renderAnnotations]);

    // 4. Redraw annotations when they change (From main branch)
    useEffect(() => {
        if (pdfDoc && scale > 0) {
            const redraw = async () => {
                try {
                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale });
                    renderAnnotations(viewport);
                } catch (e) {
                    console.error("Redraw error:", e);
                }
            };
            redraw();
        }
    }, [pdfDoc, pageNum, scale, annotations, renderAnnotations]);

    const changePage = useCallback((offset: number) => {
        if (!pdfDoc) return;
        onPageChange(Math.min(Math.max(pageNum + offset, 1), pdfDoc.numPages));
    }, [pageNum, pdfDoc, onPageChange]);

    const [pageJumpInput, setPageJumpInput] = useState("");
    const handlePageJump = useCallback(() => {
        const targetPage = parseInt(pageJumpInput, 10);
        if (pdfDoc && !isNaN(targetPage) && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
            onPageChange(targetPage);
            setPageJumpInput("");
        }
    }, [pageJumpInput, pdfDoc, onPageChange]);

    const { data: bookmarks, refetch: refetchBookmarks } = api.bookmarks.getForNote.useQuery(
        { noteId: noteId! },
        { enabled: !!noteId }
    );

    const toggleBookmarkMutation = api.bookmarks.toggle.useMutation({
        onSuccess: () => refetchBookmarks(),
        onError: () => alert('Failed to toggle bookmark. Please sign in.'),
    });

    const isCurrentPageBookmarked = bookmarks?.some((b: { pageNumber: number }) => b.pageNumber === pageNum);

    const handleToggleBookmark = useCallback(() => {
        if (!noteId) return;
        toggleBookmarkMutation.mutate({ noteId, pageNumber: pageNum });
    }, [noteId, pageNum, toggleBookmarkMutation]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.key.toLowerCase()) {
                case "arrowleft": changePage(-1); break;
                case "arrowright": changePage(1); break;
                case "b": handleToggleBookmark(); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [changePage, handleToggleBookmark]);

    if (error) return <div className="text-red-500 font-bold p-4 bg-red-100 rounded-lg">{error}</div>;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
            {loading && <div className="animate-pulse text-gray-500">Loading document...</div>}

            <div
                className="relative border border-white/20 shadow-2xl rounded-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
                onDoubleClick={onDoubleClick}
            >
                <canvas ref={canvasRef} className="max-w-full" />
                <canvas
                    ref={annotationCanvasRef}
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{ width: viewportDimensions?.width, height: viewportDimensions?.height }}
                />

                {/* Text Notes Overlay */}
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

            {/* Controls - Liquid Glass Theme */}
            <div className="space-y-4 w-full px-4">
                <div className="flex gap-3 items-center justify-center flex-wrap backdrop-blur-3xl bg-white/10 dark:bg-black/40 rounded-3xl p-5 border border-white/20 dark:border-white/10 shadow-xl">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={pageNum <= 1}
                        className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-100 backdrop-blur-3xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 transition-all border border-white/40 dark:border-white/10 shadow-lg disabled:opacity-30 active:scale-95"
                    >
                        Previous
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={pageJumpInput}
                            onChange={(e) => setPageJumpInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
                            placeholder="#"
                            className="w-16 px-3 py-2.5 rounded-xl text-center text-sm backdrop-blur-2xl bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all text-gray-900 dark:text-white"
                        />
                        <button
                            onClick={handlePageJump}
                            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors"
                        >
                            Jump
                        </button>
                    </div>

                    <div className="px-6 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                        <span className="text-sm font-black text-gray-700 dark:text-gray-300">
                            {pageNum} <span className="text-gray-400">/</span> {pdfDoc?.numPages || "--"}
                        </span>
                    </div>

                    <button
                        onClick={() => changePage(1)}
                        disabled={!pdfDoc || pageNum >= (pdfDoc.numPages || 0)}
                        className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-100 backdrop-blur-3xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 transition-all border border-white/40 dark:border-white/10 shadow-lg disabled:opacity-30 active:scale-95"
                    >
                        Next
                    </button>

                    {noteId && (
                        <button
                            onClick={handleToggleBookmark}
                            disabled={toggleBookmarkMutation.isPending}
                            className={`p-3 rounded-2xl backdrop-blur-xl border transition-all ${isCurrentPageBookmarked
                                ? "bg-yellow-400/20 border-yellow-400/50"
                                : "bg-white/40 dark:bg-white/10 border-white/40 dark:border-white/10"
                                }`}
                        >
                            <Star className={`w-5 h-5 ${isCurrentPageBookmarked ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
                        </button>
                    )}
                </div>

                {/* Bookmarks List Overlay */}
                {noteId && bookmarks && bookmarks.length > 0 && (
                    <div className="backdrop-blur-2xl bg-white/20 dark:bg-black/20 rounded-3xl p-6 border border-white/30 dark:border-white/5 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <Bookmark className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-black uppercase tracking-tighter dark:text-gray-200">
                                Quick Jump Bookmarks
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {bookmarks.map((bookmark: { id: string; pageNumber: number }) => (
                                <button
                                    key={bookmark.id}
                                    onClick={() => onPageChange(bookmark.pageNumber)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${bookmark.pageNumber === pageNum
                                        ? "bg-orange-500 text-white border-orange-400 shadow-orange-500/40 shadow-lg scale-110"
                                        : "bg-white/40 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-white/40 dark:border-white/10 hover:bg-white/60"
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
