"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    pageNum: number;
    onPageChange: (page: number) => void;
}

export function PdfViewer({ url, pageNum, onPageChange }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [scale, setScale] = useState(1.0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const renderTaskRef = useRef<any>(null);

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

    // 2. Handle Responsive Scaling
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
    }, [pdfDoc, pageNum]); // Depend on doc/page to recalculate when they change

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
                } as any;

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;
            } catch (err: any) {
                if (err.name !== "RenderingCancelledException") {
                    console.error("Error rendering page:", err);
                    // Don't set error on cancel
                    setError("Failed to render page");
                }
            }
        };

        renderPage();
    }, [pdfDoc, pageNum, scale]);

    const changePage = (offset: number) => {
        onPageChange(Math.min(Math.max(pageNum + offset, 1), pdfDoc?.numPages || 1));
    };

    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
            {loading && <div>Loading PDF...</div>}

            <div className="border border-gray-200 shadow-lg rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                <canvas ref={canvasRef} className="max-w-full" />
            </div>

            <div className="flex gap-4 items-center">
                <button
                    onClick={() => changePage(-1)}
                    disabled={pageNum <= 1}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
                >
                    Previous
                </button>
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
            </div>
        </div>
    );
}
