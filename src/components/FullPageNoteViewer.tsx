"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import {
    X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Info,
    Pen, Eraser, RotateCcw, Highlighter, Type, ChevronDown, ChevronUp, Plus
} from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Point, Stroke, TextNote, PageAnnotations } from "./annotations/types";
import { TextNoteOverlay } from "./annotations/TextNoteOverlay";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface FullPageNoteViewerProps {
    url: string;
    initialPage?: number;
    isOpen: boolean;
    onClose: () => void;
    noteTitle?: string;
    versionId: string;
}

type ZoomMode = "fit-width" | "fit-height" | "custom";
type Tool = "pen" | "eraser" | "highlighter" | "text";


const COLORS = [
    { name: "Black", value: "#000000" },
    { name: "Red", value: "#FF0000" },
    { name: "Blue", value: "#0000FF" },
    { name: "Green", value: "#008000" },
    { name: "Purple", value: "#800080" },
];

const HIGHLIGHT_COLORS = [
    { name: "Yellow", value: "rgba(255, 255, 0, 0.3)" },
    { name: "Green", value: "rgba(76, 175, 80, 0.3)" },
    { name: "Pink", value: "rgba(233, 30, 99, 0.3)" },
    { name: "Blue", value: "rgba(33, 150, 243, 0.3)" },
    { name: "Orange", value: "rgba(255, 152, 0, 0.3)" },
];

const TEXT_COLORS = [
    { name: "Black", value: "#000000" },
    { name: "Blue", value: "#2563eb" },
    { name: "Red", value: "#dc2626" },
    { name: "Green", value: "#16a34a" },
    { name: "Purple", value: "#9333ea" },
    { name: "Orange", value: "#ea580c" },
    { name: "Yellow", value: "#facc15" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24];

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


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
    const penColorInputRef = useRef<HTMLInputElement>(null);
    const highlightColorInputRef = useRef<HTMLInputElement>(null);
    const textColorInputRef = useRef<HTMLInputElement>(null);

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
    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
    const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
    const [penWidth, setPenWidth] = useState(2);
    const [highlightWidth, setHighlightWidth] = useState(20);
    const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
    const [history, setHistory] = useState<Record<number, Stroke[][]>>({});
    const [future, setFuture] = useState<Record<number, Stroke[][]>>({});
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [isErasing, setIsErasing] = useState(false);

    // Text Note State
    const [textNotes, setTextNotes] = useState<Record<number, TextNote[]>>({});
    const [editingNote, setEditingNote] = useState<{ pageNum: number; noteId: string } | null>(null);
    const [textColor, setTextColor] = useState(TEXT_COLORS[0].value);
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [textUnderline, setTextUnderline] = useState(false);
    const [textFontSize, setTextFontSize] = useState(14);
    const [showTextColorPicker, setShowTextColorPicker] = useState(false);
    const textColorPickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            const parsed = savedAnnotations as unknown as Record<number, PageAnnotations>;

            // Extract strokes
            const strokesData: Record<number, Stroke[]> = {};
            const textNotesData: Record<number, TextNote[]> = {};

            Object.entries(parsed).forEach(([pageNum, data]) => {
                if (data.strokes) {
                    strokesData[parseInt(pageNum)] = data.strokes;
                }
                if (data.textNotes) {
                    textNotesData[parseInt(pageNum)] = data.textNotes;
                }
            });

            setAnnotations(strokesData);
            setTextNotes(textNotesData);
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
        setTimeout(() => setIsAnimatingIn(true), 10);
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
        if (zoomMode !== "custom") {
            // Wrap in timeout to avoid "setState synchronously in effect" warning, 
            // although updateScale is async, it might be safer to defer.
            const t = setTimeout(() => {
                updateScale();
            }, 0);
            return () => clearTimeout(t);
        }
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
                // Check if it's a cancellation error
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isCancelled = err && typeof err === 'object' && 'name' in err && (err as any).name === "RenderingCancelledException";
                if (!isCancelled) {
                    if (err instanceof Error && err.name !== "RenderingCancelledException") {
                        console.error("Error rendering page:", err);
                        setError("Failed to render page");
                    }
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
        const drawStroke = (points: Point[], color: string, strokeType: "pen" | "highlighter", width_val?: number) => {
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.lineWidth = width_val || (strokeType === "highlighter" ? 20 : 2);
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

        // Draw existing annotations
        (annotations[pageNum] || []).forEach(stroke => {
            drawStroke(stroke.points, stroke.color, stroke.type, stroke.width);
        });

        // Draw current stroke being drawn
        if (currentStroke) {
            const strokeColor = tool === 'highlighter' ? highlightColor : penColor;
            const strokeType = tool === 'highlighter' ? "highlighter" : "pen";
            const strokeWidth = tool === 'highlighter' ? highlightWidth : penWidth;
            drawStroke(currentStroke, strokeColor, strokeType, strokeWidth);
        }

    }, [annotations, currentStroke, pageNum, viewportDimensions, penColor, highlightColor, tool]);


    // Undo / Redo Logic
    const addToHistory = (pNum: number) => {
        setHistory(prev => ({
            ...prev,
            [pNum]: [...(prev[pNum] || []), annotations[pNum] || []]
        }));
        setFuture(prev => ({ ...prev, [pNum]: [] })); // Clear redo stack on new action
    };

    const handleUndo = useCallback(() => {
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
    }, [history, pageNum, annotations]);

    const handleRedo = useCallback(() => {
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
    }, [future, pageNum, annotations]);


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

        if (tool === 'pen' || tool === 'highlighter') {
            setCurrentStroke([point]);
        } else if (tool === 'eraser') {
            setIsErasing(true);
            addToHistory(pageNum); // Save state before erasing session
            performErase(point);
        } else if (tool === 'text') {
            handleCanvasClick(e);
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

    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const highlightPickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Highlight Picker Hover Logic
    const handleHighlightPickerMouseEnter = () => {
        if (highlightPickerTimeoutRef.current) clearTimeout(highlightPickerTimeoutRef.current);
        setShowHighlightPicker(true);
    };

    const handleHighlightPickerMouseLeave = () => {
        highlightPickerTimeoutRef.current = setTimeout(() => {
            setShowHighlightPicker(false);
        }, 500);
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (colorPickerTimeoutRef.current) clearTimeout(colorPickerTimeoutRef.current);
            if (highlightPickerTimeoutRef.current) clearTimeout(highlightPickerTimeoutRef.current);
        };
    }, []);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        const point = getPoint(e);
        if (!point) return;

        if (tool === 'pen' || tool === 'highlighter') {
            setCurrentStroke(prev => prev ? [...prev, point] : [point]);
        } else if (tool === 'eraser' && isErasing) {
            performErase(point);
        }
    };

    const handlePointerUp = () => {
        if ((tool === 'pen' || tool === 'highlighter') && currentStroke) {
            if (currentStroke.length > 1) {
                addToHistory(pageNum);
                const strokeColor = tool === 'highlighter' ? highlightColor : penColor;
                const strokeType = tool === 'highlighter' ? "highlighter" : "pen";
                const strokeWidth = tool === 'highlighter' ? highlightWidth : penWidth;
                setAnnotations(prev => ({
                    ...prev,
                    [pageNum]: [...(prev[pageNum] || []), {
                        points: currentStroke,
                        color: strokeColor,
                        type: strokeType,
                        width: strokeWidth
                    }]
                }));
                setUnsavedChanges(true);
            }
            setCurrentStroke(null);
        }
        if (tool === 'eraser') {
            setIsErasing(false);
        }
    };

    const handleSaveTextNote = (id: string, content: string) => {
        if (!content.trim()) {
            handleDeleteTextNote(id);
            return;
        }

        setTextNotes(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).map(note =>
                note.id === id ? { ...note, content, updatedAt: Date.now() } : note
            )
        }));
        setEditingNote(null);
        setUnsavedChanges(true);
    };

    const handleCancelTextNote = (id: string) => {
        const note = textNotes[pageNum]?.find(n => n.id === id);
        if (note && !note.content.trim()) {
            handleDeleteTextNote(id);
        }
        setEditingNote(null);
    };

    const handleDeleteTextNote = (id: string) => {
        setTextNotes(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).filter(note => note.id !== id)
        }));
        setUnsavedChanges(true);
    };

    const handleToggleCollapse = (id: string) => {
        setTextNotes(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).map(note =>
                note.id === id ? { ...note, collapsed: !note.collapsed } : note
            )
        }));
        setUnsavedChanges(true);
    };

    const handleUpdateTextNote = (id: string, updates: Partial<TextNote>) => {
        setTextNotes(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).map(note =>
                note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
            )
        }));
        setUnsavedChanges(true);
    };

    const handleCanvasClick = (e: React.PointerEvent) => {
        if (tool !== 'text') return;

        // If already editing, auto-save the current one if it has content, then move on
        if (editingNote) {
            const currentNote = textNotes[editingNote.pageNum]?.find(n => n.id === editingNote.noteId);
            if (currentNote && !currentNote.content.trim()) {
                // If current is empty, just remove it before adding new one
                setTextNotes(prev => ({
                    ...prev,
                    [editingNote.pageNum]: (prev[editingNote.pageNum] || []).filter(n => n.id !== editingNote.noteId)
                }));
            }
            // Clear editing state for now (we'll start a new one)
            setEditingNote(null);
        }

        const point = getPoint(e);
        if (!point) return;

        const newNote: TextNote = {
            id: uuidv4(),
            x: point.x,
            y: point.y,
            content: "",
            color: textColor,
            bold: textBold,
            italic: textItalic,
            underline: textUnderline,
            width: 0.3, // 30% of page width default
            fontSize: textFontSize,
            collapsed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setTextNotes(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), newNote]
        }));
        setEditingNote({ pageNum, noteId: newNote.id });
        setUnsavedChanges(true);
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

        // Get all unique page numbers from both annotations and textNotes
        const allPages = new Set([
            ...Object.keys(annotations),
            ...Object.keys(textNotes)
        ]);

        const promises = Array.from(allPages).map(pNum => {
            const pageNum = parseInt(pNum);
            return saveMutation.mutateAsync({
                versionId,
                pageNumber: pageNum,
                content: {
                    strokes: annotations[pageNum] || [],
                    textNotes: textNotes[pageNum] || []
                }
            });
        });
        await Promise.all(promises);
        setUnsavedChanges(false);
        utils.notes.getAnnotations.invalidate({ versionId });
        setShowSavePrompt(false);
        onClose();
    };

    const handleDiscardExit = () => {
        setShowSavePrompt(false);
        setUnsavedChanges(false);
        // CRITICAL FIX: Revert local state to match saved state so changes don't persist in memory
        if (savedAnnotations) {
            const parsed = savedAnnotations as unknown as Record<number, PageAnnotations>;
            const strokesData: Record<number, Stroke[]> = {};
            const textNotesData: Record<number, TextNote[]> = {};

            Object.entries(parsed).forEach(([pageNum, data]) => {
                if (data.strokes) strokesData[parseInt(pageNum)] = data.strokes;
                if (data.textNotes) textNotesData[parseInt(pageNum)] = data.textNotes;
            });

            setAnnotations(strokesData);
            setTextNotes(textNotesData);
        } else {
            setAnnotations({});
            setTextNotes({});
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

    // Added Logic from HEAD: Zoom controls
    const handleZoomIn = () => {
        setZoomMode("custom");
        setScale((prev) => Math.min(prev + 0.2, 3.0));
    };

    const handleZoomOut = () => {
        setZoomMode("custom");
        setScale((prev) => Math.max(prev - 0.2, 0.5));
    };

    const toggleZoomMode = () => {
        setZoomMode((prev) => (prev === "fit-width" ? "fit-height" : "fit-width"));
    };

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
                            className={`absolute inset-0 z-10 touch-none ${tool === "eraser" ? "cursor-no-drop" : tool === "text" ? "cursor-text" : "cursor-crosshair"}`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        />

                        {/* Text Notes Overlay */}
                        {viewportDimensions && textNotes[pageNum]?.map(note => (
                            <TextNoteOverlay
                                key={note.id}
                                note={note}
                                viewportDimensions={viewportDimensions}
                                isEditing={editingNote?.noteId === note.id}
                                onSave={handleSaveTextNote}
                                onUpdate={handleUpdateTextNote}
                                onCancel={handleCancelTextNote}
                                onClick={(id) => setEditingNote({ pageNum, noteId: id })}
                                onDelete={handleDeleteTextNote}
                                onToggleCollapse={handleToggleCollapse}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Added: Reuse Zoom Controls from HEAD if needed, for instance in a bottom bar or overlay if desired, but for now I kept the methods available. */}
        </div>
    );
}
