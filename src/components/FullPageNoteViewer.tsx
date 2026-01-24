"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
    X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Info,
    Pen, Eraser, RotateCcw
} from "lucide-react";
import { api } from "@/app/_trpc/client";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

interface FullPageNoteViewerProps {
    url: string;
    initialPage?: number;
    isOpen: boolean;
    onClose: () => void;
    noteTitle?: string;
    versionId: string;
}

type ZoomMode = "fit-width" | "fit-height" | "custom";
type Tool = "pen" | "eraser";

interface Point {
    x: number; // 0-1 relative to page width
    y: number; // 0-1 relative to page height
}

interface Stroke {
    points: Point[];
    color: string;
    type: "pen";
}

const COLORS = [
    { name: "Black", value: "#000000" },
    { name: "Red", value: "#FF0000" },
    { name: "Blue", value: "#0000FF" },
    { name: "Green", value: "#008000" },
    { name: "Purple", value: "#800080" },
];

export function FullPageNoteViewer({
    url,
    initialPage = 1,
    isOpen,
    onClose,
    noteTitle,
    versionId
}: FullPageNoteViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

    // PDF State
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageNum, setPageNum] = useState(initialPage);
    const [scale, setScale] = useState(1.0);
    const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
    const [viewportDimensions, setViewportDimensions] = useState<{ width: number, height: number } | null>(null);

    // UI state
    const [showControls, setShowControls] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    // Annotation State
    const [tool, setTool] = useState<Tool>("pen");
    const [penColor, setPenColor] = useState(COLORS[0].value);
    const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
    const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
    const [history, setHistory] = useState<Record<number, Stroke[][]>>({});
    const [future, setFuture] = useState<Record<number, Stroke[][]>>({});
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [isErasing, setIsErasing] = useState(false);

    // API Hooks
    const utils = api.useUtils();
    const { data: savedAnnotations } = api.notes.getAnnotations.useQuery(
        { versionId },
        { enabled: !!isOpen && !!versionId }
    );
    const saveMutation = api.notes.saveAnnotation.useMutation();

    // -------------------------------------------------------------------------
    // INITIALIZATION & LOADING
    // -------------------------------------------------------------------------

    // Load annotations from DB when opened
    useEffect(() => {
        if (savedAnnotations) {
            setAnnotations(savedAnnotations as unknown as Record<number, Stroke[]>);
            setUnsavedChanges(false);
            setHistory({});
            setFuture({});
        }
    }, [savedAnnotations]);

    // Load PDF
    useEffect(() => {
        if (!isOpen) return;
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
        loadPdf();
    }, [url, isOpen]);

    // Animation entry
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAnimatingIn(true);
        } else {
            setIsAnimatingIn(false);
        }
    }, [isOpen]);

    // -------------------------------------------------------------------------
    // ZOOM & RENDER LOGIC
    // -------------------------------------------------------------------------

    // Calculate scale setup
    const updateScale = useCallback(async () => {
        if (!pdfDoc || !containerRef.current) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const container = containerRef.current;
            const availableWidth = container.clientWidth - 64;
            const availableHeight = window.innerHeight - 200;

            let newScale: number;
            if (zoomMode === "fit-width") {
                newScale = availableWidth / viewport.width;
            } else if (zoomMode === "fit-height") {
                newScale = availableHeight / viewport.height;
            } else {
                return; // Custom mode maintains current scale
            }
            setScale(Math.max(0.5, Math.min(newScale, 5.0)));
        } catch (e) {
            console.error("Error updating scale:", e);
        }
    }, [pdfDoc, pageNum, zoomMode]);

    useEffect(() => {
        if (zoomMode !== "custom") void updateScale();
    }, [updateScale, zoomMode]);

    useEffect(() => {
        if (!isOpen) return;
        const handleResize = () => { if (zoomMode !== "custom") updateScale(); };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isOpen, updateScale, zoomMode]);

    // Render Page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;
            if (renderTaskRef.current) renderTaskRef.current.cancel();

            try {
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                setViewportDimensions({ width: viewport.width, height: viewport.height });

                // Annot canvas sync
                if (annotationCanvasRef.current) {
                    annotationCanvasRef.current.width = viewport.width;
                    annotationCanvasRef.current.height = viewport.height;
                }

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
                    console.error("Render error:", err);
                }
            }
        };
        renderPage();
    }, [pdfDoc, pageNum, scale]);

    // -------------------------------------------------------------------------
    // ANNOTATION LOGIC (Refined)
    // -------------------------------------------------------------------------

    // Render Annotations Loop
    useEffect(() => {
        const canvas = annotationCanvasRef.current;
        if (!canvas || !viewportDimensions) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const { width, height } = viewportDimensions;

        // Helper to draw stroke
        const drawStroke = (points: Point[], color: string) => {
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.lineWidth = 2; // Fixed thickness for vector feel, or scale * 2
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;

            // Convert normalized -> screen
            ctx.moveTo(points[0].x * width, points[0].y * height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * width, points[i].y * height);
            }
            ctx.stroke();
        };

        // Draw saved strokes
        const pageStrokes = annotations[pageNum] || [];
        pageStrokes.forEach(stroke => drawStroke(stroke.points, stroke.color));

        // Draw current stroke
        if (currentStroke) {
            drawStroke(currentStroke, penColor);
        }

    }, [annotations, currentStroke, pageNum, viewportDimensions, penColor]);


    // Undo / Redo Logic
    const addToHistory = (pNum: number) => {
        setHistory(prev => ({
            ...prev,
            [pNum]: [...(prev[pNum] || []), annotations[pNum] || []]
        }));
        setFuture(prev => ({ ...prev, [pNum]: [] })); // Clear redo stack on new action
    };

    const handleUndo = () => {
        const pageHistory = history[pageNum];
        if (!pageHistory || pageHistory.length === 0) return;

        const previousState = pageHistory[pageHistory.length - 1];
        const newHistory = pageHistory.slice(0, -1);

        setFuture(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), annotations[pageNum] || []]
        }));
        setHistory(prev => ({ ...prev, [pageNum]: newHistory }));
        setAnnotations(prev => ({ ...prev, [pageNum]: previousState }));
        setUnsavedChanges(true);
    };

    const handleRedo = () => {
        const pageFuture = future[pageNum];
        if (!pageFuture || pageFuture.length === 0) return;

        const nextState = pageFuture[pageFuture.length - 1];
        const newFuture = pageFuture.slice(0, -1);

        setHistory(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), annotations[pageNum] || []]
        }));
        setFuture(prev => ({ ...prev, [pageNum]: newFuture }));
        setAnnotations(prev => ({ ...prev, [pageNum]: nextState }));
        setUnsavedChanges(true);
    };


    // Input Handlers
    const getPoint = (e: React.PointerEvent): Point | null => {
        const canvas = annotationCanvasRef.current;
        if (!canvas || !viewportDimensions) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;  // 0-1
        const y = (e.clientY - rect.top) / rect.height; // 0-1

        // Clamp to 0-1 to ensure we don't draw outside PDF bounds logically
        return {
            x: Math.max(0, Math.min(x, 1)),
            y: Math.max(0, Math.min(y, 1))
        };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        const point = getPoint(e);
        if (!point) return;

        if (tool === 'pen') {
            setCurrentStroke([point]);
        } else if (tool === 'eraser') {
            setIsErasing(true);
            addToHistory(pageNum); // Save state before erasing session
            performErase(point);
        }
    };

    const performErase = (p: Point) => {
        setAnnotations(prev => {
            const pageStrokes = prev[pageNum] || [];
            const radius = 0.02;
            const remaining = pageStrokes.filter(stroke => !stroke.points.some(sp => Math.abs(sp.x - p.x) < radius && Math.abs(sp.y - p.y) < radius));

            if (remaining.length !== pageStrokes.length) {
                setUnsavedChanges(true);
                return { ...prev, [pageNum]: remaining };
            }
            return prev;
        });
    };

    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Color Picker Hover Logic
    const handleColorPickerMouseEnter = () => {
        if (colorPickerTimeoutRef.current) clearTimeout(colorPickerTimeoutRef.current);
        setShowColorPicker(true);
    };

    const handleColorPickerMouseLeave = () => {
        colorPickerTimeoutRef.current = setTimeout(() => {
            setShowColorPicker(false);
        }, 500);
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (colorPickerTimeoutRef.current) clearTimeout(colorPickerTimeoutRef.current);
        };
    }, []);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        const point = getPoint(e);
        if (!point) return;

        if (tool === 'pen') {
            setCurrentStroke(prev => prev ? [...prev, point] : [point]);
        } else if (tool === 'eraser' && isErasing) {
            performErase(point);
        }
    };

    const handlePointerUp = () => {
        if (tool === 'pen' && currentStroke) {
            if (currentStroke.length > 1) {
                addToHistory(pageNum);
                setAnnotations(prev => ({
                    ...prev,
                    [pageNum]: [...(prev[pageNum] || []), { points: currentStroke, color: penColor, type: "pen" }]
                }));
                setUnsavedChanges(true);
            }
            setCurrentStroke(null);
        }
        if (tool === 'eraser') {
            setIsErasing(false);
        }
    };

    // -------------------------------------------------------------------------
    // CLOSE LOGIC
    // -------------------------------------------------------------------------

    const handleCloseRequest = () => {
        if (unsavedChanges) {
            setShowSavePrompt(true);
        } else {
            onClose();
        }
    };

    const handleSaveExit = async () => {
        if (!versionId) return;

        const promises = Object.entries(annotations).map(([pNum, content]) =>
            saveMutation.mutateAsync({
                versionId,
                pageNumber: parseInt(pNum),
                content: content as any
            })
        );
        await Promise.all(promises);
        setUnsavedChanges(false);
        utils.notes.getAnnotations.invalidate({ versionId });
        setShowSavePrompt(false);
        onClose();
    };

    const handleDiscardExit = () => {
        setShowSavePrompt(false);
        setUnsavedChanges(false);
        // CRITICAL FIX: Revert local state to matches saved state so changes don't persist in memory
        if (savedAnnotations) {
            setAnnotations(savedAnnotations as unknown as Record<number, Stroke[]>);
        } else {
            setAnnotations({});
        }
        setHistory({});
        setFuture({});
        onClose(); // Exit without saving
    };

    // -------------------------------------------------------------------------
    // CONTROLS & HELPERS
    // -------------------------------------------------------------------------

    const resetControls = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const move = () => resetControls();
        window.addEventListener("mousemove", move);
        return () => window.removeEventListener("mousemove", move);
    }, [isOpen, resetControls]);

    const changePage = useCallback((off: number) => {
        if (pdfDoc) setPageNum(p => Math.min(Math.max(p + off, 1), pdfDoc.numPages));
    }, [pdfDoc]);

    // Shortcuts
    useEffect(() => {
        if (!isOpen) return;
        const kd = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleCloseRequest();
            if (e.key === "ArrowLeft") changePage(-1);
            if (e.key === "ArrowRight") changePage(1);
            // Undo/Redo shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) handleRedo();
                else handleUndo();
            }
        };
        window.addEventListener("keydown", kd);
        return () => window.removeEventListener("keydown", kd);
    }, [isOpen, changePage, unsavedChanges, handleUndo, handleRedo]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/95 flex items-center justify-center transition-opacity duration-300 ${isAnimatingIn ? "opacity-100" : "opacity-0"}`}
            onMouseDown={(e) => {
                // Only close if clicking backdrop specifically (and not drawing)
                if (e.target === e.currentTarget && !showSavePrompt) handleCloseRequest();
            }}
        >
            {/* --- SAVE PROMPT --- */}
            {showSavePrompt && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-white/10 animate-in fade-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Save annotations?</h3>
                        <p className="text-gray-500 mb-6">You have unsaved changes. Do you want to save before leaving?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowSavePrompt(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleDiscardExit} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg">Discard & Exit</button>
                            <button onClick={handleSaveExit} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg">
                                {saveMutation.isPending ? "Saving..." : "Save & Exit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TOP BAR --- */}
            <div className={`absolute top-0 left-0 right-20 z-40 p-6 bg-gradient-to-b from-black/60 to-transparent transition-all duration-200 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
                {noteTitle && <h2 className="text-white text-xl font-bold">{noteTitle}</h2>}
            </div>

            {/* --- CLOSE --- */}
            <button onClick={handleCloseRequest} className="absolute top-4 right-4 z-50 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white">
                <X className="w-6 h-6" />
            </button>


            {/* --- MAIN CANVAS AREA --- */}
            <div ref={containerRef} className="w-full h-full flex items-center justify-center p-8 overflow-auto relative touch-none">
                {loading && <div className="text-white text-xl">Loading PDF...</div>}
                {error && <div className="text-red-400 text-xl">{error}</div>}

                {!loading && !error && (
                    <div className="shadow-2xl rounded-lg overflow-hidden bg-white relative cursor-crosshair">
                        <canvas ref={canvasRef} className="block" />
                        <canvas
                            ref={annotationCanvasRef}
                            className={`absolute inset-0 z-10 touch-none ${tool === "eraser" ? "cursor-no-drop" : "cursor-crosshair"}`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        />
                    </div>
                )}
            </div>

            {/* --- BOTTOM TOOLBAR --- */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-200 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                <div className="bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-2xl flex items-center gap-4">

                    {/* Navigation */}
                    <div className="flex items-center gap-1 px-2 border-r border-white/10">
                        <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-white font-mono min-w-[3rem] text-center">{pageNum}/{pdfDoc?.numPages || "-"}</span>
                        <button onClick={() => changePage(1)} disabled={!pdfDoc || pageNum >= pdfDoc.numPages} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    {/* Annotation Tools */}
                    <div className="flex items-center gap-2 px-2 border-r border-white/10">
                        {/* Undo/Redo */}
                        <div className="flex items-center gap-1 mr-2">
                            <button onClick={handleUndo} disabled={!history[pageNum]?.length} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30" title="Undo (Ctrl+Z)"><RotateCcw className="w-4 h-4" /></button>
                            <button onClick={handleRedo} disabled={!future[pageNum]?.length} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30" title="Redo (Ctrl+Shift+Z)"><RotateCcw className="w-4 h-4 scale-x-[-1]" /></button>
                        </div>

                        {/* Pen */}
                        <div
                            className="relative"
                            onMouseEnter={handleColorPickerMouseEnter}
                            onMouseLeave={handleColorPickerMouseLeave}
                        >
                            <button
                                onClick={() => setTool("pen")}
                                className={`p-2 rounded-lg transition-all ${tool === "pen" ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/10"}`}
                            >
                                <Pen className="w-5 h-5" />
                            </button>

                            {/* Color Picker with state-controlled visibility and delay */}
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pb-2 transition-all flex flex-col items-center ${showColorPicker ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                                <div className={`p-2 bg-zinc-800 rounded-xl border border-white/10 shadow-xl flex gap-1 transition-all origin-bottom ${showColorPicker ? "scale-100" : "scale-95"}`}>
                                    {COLORS.map(c => (
                                        <button
                                            key={c.name}
                                            onClick={(e) => { e.stopPropagation(); setPenColor(c.value); setTool("pen"); }}
                                            className={`w-6 h-6 rounded-full border-2 ${penColor === c.value ? "border-white" : "border-transparent"} hover:scale-110 transition-transform`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Eraser */}
                        <button
                            onClick={() => setTool("eraser")}
                            className={`p-2 rounded-lg transition-all ${tool === "eraser" ? "bg-red-600 text-white" : "text-white/70 hover:bg-white/10"}`}
                        >
                            <Eraser className="w-5 h-5" />
                        </button>

                        <div className="w-6 h-6 rounded-full border border-white/20 ml-2" style={{ backgroundColor: penColor }} title="Current Color" />
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center gap-1 px-2">
                        <button onClick={() => { setZoomMode("custom"); setScale(s => Math.max(s - 0.2, 0.5)); }} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
                        <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => { setZoomMode("custom"); setScale(s => Math.min(s + 0.2, 5.0)); }} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
                        <button onClick={() => setZoomMode(z => z === "fit-width" ? "fit-height" : "fit-width")} className="p-2 text-white hover:bg-white/10 rounded-lg" title="Toggle Fit">
                            {zoomMode === "fit-width" ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
}
