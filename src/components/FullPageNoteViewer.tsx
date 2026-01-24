"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Info } from "lucide-react";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

interface FullPageNoteViewerProps {
    url: string;
    initialPage?: number;
    isOpen: boolean;
    onClose: () => void;
    noteTitle?: string;
}

type ZoomMode = "fit-width" | "fit-height" | "custom";

export function FullPageNoteViewer({
    url,
    initialPage = 1,
    isOpen,
    onClose,
    noteTitle
}: FullPageNoteViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageNum, setPageNum] = useState(initialPage);
    const [scale, setScale] = useState(1.0);
    const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
    const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    // Load PDF Document
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

    // Animate in when opening
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAnimatingIn(true);
        } else {

            setIsAnimatingIn(false);
        }
    }, [isOpen]);

    // Handle zoom and responsive scaling
    const updateScale = useCallback(async () => {
        if (!pdfDoc || !containerRef.current) return;

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const container = containerRef.current;

            const availableWidth = container.clientWidth - 64; // padding
            const availableHeight = window.innerHeight - 200; // controls and padding

            let newScale: number;

            if (zoomMode === "fit-width") {
                newScale = availableWidth / viewport.width;
            } else if (zoomMode === "fit-height") {
                newScale = availableHeight / viewport.height;
            } else {
                // Keep current custom scale
                return;
            }

            setScale(Math.max(0.5, Math.min(newScale, 5.0))); // Clamp between 0.5 and 5.0
        } catch (e) {
            console.error("Error updating scale:", e);
        }
    }, [pdfDoc, pageNum, zoomMode]);

    // Update scale when zoom mode or dependencies change
    useEffect(() => {
        if (zoomMode !== "custom") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void updateScale();
        }
    }, [updateScale, zoomMode]);

    // Handle window resize
    useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => {
            if (zoomMode !== "custom") {
                updateScale();
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isOpen, updateScale, zoomMode]);

    // Render PDF page
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
                    setError("Failed to render page");
                }
            }
        };

        renderPage();
    }, [pdfDoc, pageNum, scale]);

    // Auto-hide controls
    const resetHideControlsTimer = useCallback(() => {
        setShowControls(true);

        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }

        hideControlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, []);

    // Mouse movement detection
    useEffect(() => {
        if (!isOpen) return;

        const handleMouseMove = () => {
            resetHideControlsTimer();
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (hideControlsTimeoutRef.current) {
                clearTimeout(hideControlsTimeoutRef.current);
            }
        };
    }, [isOpen, resetHideControlsTimer]);

    // Helper functions for keyboard shortcuts
    const changePage = useCallback((offset: number) => {
        if (!pdfDoc) return;
        const newPage = Math.min(Math.max(pageNum + offset, 1), pdfDoc.numPages);
        setPageNum(newPage);
    }, [pdfDoc, pageNum]);

    const handleZoomIn = useCallback(() => {
        setZoomMode("custom");
        setScale((prev) => Math.min(prev + 0.2, 5.0));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomMode("custom");
        setScale((prev) => Math.max(prev - 0.2, 0.5));
    }, []);

    const toggleZoomMode = useCallback(() => {
        setZoomMode((prev) => (prev === "fit-width" ? "fit-height" : "fit-width"));
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    changePage(-1);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    changePage(1);
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    handleZoomIn();
                    break;
                case "-":
                    e.preventDefault();
                    handleZoomOut();
                    break;
                case "0":
                    e.preventDefault();
                    setZoomMode("fit-width");
                    break;
                case "f":
                case "F":
                    e.preventDefault();
                    toggleZoomMode();
                    break;
                case "?":
                    e.preventDefault();
                    setShowHelp(!showHelp);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, showHelp, changePage, handleZoomIn, handleZoomOut, toggleZoomMode]);



    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/95 flex items-center justify-center transition-opacity duration-300 ${isAnimatingIn ? "opacity-100" : "opacity-0"
                }`}
            onClick={handleBackdropClick}
        >
            {/* Close Button - Always Visible */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-200 text-white group"
                title="Close (ESC)"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Help Button */}
            <button
                onClick={() => setShowHelp(!showHelp)}
                className="absolute top-4 right-20 z-50 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-200 text-white"
                title="Keyboard Shortcuts (?)"
            >
                <Info className="w-6 h-6" />
            </button>

            {/* Help Overlay */}
            {showHelp && (
                <div className="absolute top-20 right-4 z-50 bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-white max-w-sm border border-white/20">
                    <h3 className="text-lg font-bold mb-4">Keyboard Shortcuts</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Exit</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">ESC</kbd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Previous/Next Page</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">← →</kbd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Zoom In/Out</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">+ -</kbd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Reset Zoom</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">0</kbd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Toggle Fit Mode</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">F</kbd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Show Help</span>
                            <kbd className="px-2 py-1 bg-white/20 rounded">?</kbd>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar - Title and Info */}
            <div
                className={`absolute top-0 left-0 right-20 z-40 p-6 bg-gradient-to-b from-black/60 to-transparent transition-all duration-200 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
                    }`}
            >
                {noteTitle && (
                    <h2 className="text-white text-xl font-bold truncate">{noteTitle}</h2>
                )}
            </div>

            {/* Main Content Area */}
            <div ref={containerRef} className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                {loading && (
                    <div className="text-white text-xl">Loading PDF...</div>
                )}

                {error && (
                    <div className="text-red-400 text-xl">{error}</div>
                )}

                {!loading && !error && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="shadow-2xl rounded-lg overflow-hidden bg-white">
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div
                className={`absolute bottom-0 left-0 right-0 z-40 p-6 bg-gradient-to-t from-black/60 to-transparent transition-all duration-200 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Controls Panel */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/20">
                        <div className="flex items-center justify-between gap-4">
                            {/* Page Navigation */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => changePage(-1)}
                                    disabled={pageNum <= 1}
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
                                    title="Previous Page (←)"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-white font-medium min-w-[120px] text-center">
                                    Page {pageNum} of {pdfDoc?.numPages || "--"}
                                </span>
                                <button
                                    onClick={() => changePage(1)}
                                    disabled={!pdfDoc || pageNum >= (pdfDoc.numPages || 0)}
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white"
                                    title="Next Page (→)"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleZoomOut}
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-white"
                                    title="Zoom Out (-)"
                                >
                                    <ZoomOut className="w-5 h-5" />
                                </button>
                                <span className="text-white font-medium min-w-[80px] text-center text-sm">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={handleZoomIn}
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-white"
                                    title="Zoom In (+)"
                                >
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={toggleZoomMode}
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-white"
                                    title={`Toggle Fit Mode (F) - Current: ${zoomMode}`}
                                >
                                    {zoomMode === "fit-width" ? (
                                        <Maximize2 className="w-5 h-5" />
                                    ) : (
                                        <Minimize2 className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hint Text */}
                    <div className="text-center mt-4 text-white/60 text-sm">
                        Move your mouse to show controls • Press ? for keyboard shortcuts
                    </div>
                </div>
            </div>
        </div>
    );
}
