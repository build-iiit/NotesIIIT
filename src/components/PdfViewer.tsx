"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker URL to the CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    pageNum: number;
    onPageChange: (page: number) => void;
}

export function PdfViewer({ url, pageNum, onPageChange }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [scale] = useState(1.0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // ... (omitted sections)

    // 3. Render Page
    useEffect(() => {
        let isCancelled = false;

        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || scale === 0) return;

            // Strict Cancellation
            if (renderTaskRef.current) {
                try {
                    const cancelPromise = renderTaskRef.current.cancel();
                    if (cancelPromise && typeof cancelPromise.catch === 'function') {
                        await cancelPromise.catch(() => { });
                    }
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
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;
            } catch (err: unknown) {
                // Check if it's a cancellation error (which might not be an Error instance but usually is)
                // pdfjs-dist cancellation is sometimes an object { name: "RenderingCancelledException" }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isCancelledError = err && typeof err === 'object' && 'name' in err && (err as any).name === "RenderingCancelledException";

                if (!isCancelledError && !isCancelled) {
                    console.error("Error rendering page:", err);
                    // Don't set error on cancel
                    // setError("Failed to render page"); // Optional: suppress UI error for transient render issues
                }
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                const cancelPromise = renderTaskRef.current.cancel();
                if (cancelPromise && typeof cancelPromise.catch === 'function') {
                    cancelPromise.catch(() => { });
                }
            }
        };
    }, [pdfDoc, pageNum, scale]);

    const changePage = (offset: number) => {
        onPageChange(Math.min(Math.max(pageNum + offset, 1), pdfDoc?.numPages || 1));
    };

    if (error) return <div className="text-red-500">{error}</div>;

    // Unique ID for canvas to force remount on ANY change
    // Using simple combination of dependencies
    const canvasKey = `${pdfDoc?.fingerprints?.[0] || 'doc'}-${pageNum}-${scale}`;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
            {loading && <div>Loading PDF...</div>}

            <div className="border border-gray-200 shadow-lg rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                <canvas
                    ref={canvasRef}
                    key={canvasKey}
                    className="max-w-full"
                />
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
