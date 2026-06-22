"use client";

import { useEffect, useRef, useState, useCallback } from"react";
import * as pdfjsLib from"pdfjs-dist";
import { TextLayer } from"pdfjs-dist";
import { Bookmark, Maximize } from"lucide-react";
import { api } from"@/app/_trpc/client";
import { TextNoteOverlay } from"@/components/annotations/TextNoteOverlay";
import { Stroke, TextNote, PageAnnotations } from"@/components/annotations/types";
import { useInView } from"react-intersection-observer";

// Use local worker copy (copied by scripts/copy-pdf-worker.js at build time)
pdfjsLib.GlobalWorkerOptions.workerSrc ="/pdf.worker.min.mjs";

interface PdfViewerProps {
 url: string;
 pageNum: number;
 onPageChange: (page: number) => void;
 onDoubleClick?: () => void;
 noteId?: string;
 versionId?: string;
 onMaximize?: () => void;
 onCanvasReady?: (getImageData: () => string | null) => void;
 enableShortcuts?: boolean;
}

const PdfPageRenderer = ({
 pdfDoc,
 pageNum,
 scale,
 aspectRatio,
 annotations,
 textNotes,
 onVisible,
 setTextNotes,
 isActive
}: {
 pdfDoc: pdfjsLib.PDFDocumentProxy;
 pageNum: number;
 scale: number;
 aspectRatio: number;
 annotations: Stroke[];
 textNotes: TextNote[];
 onVisible: (page: number) => void;
 setTextNotes: React.Dispatch<React.SetStateAction<Record<number, TextNote[]>>>;
 isActive: boolean;
}) => {
 const { ref, inView } = useInView({
 rootMargin:"100% 0px 100% 0px", // Load 1 viewport above/below
 threshold: 0
 });

 const { ref: visibleRef, inView: isVisible } = useInView({
 rootMargin:"-40% 0px -40% 0px", // Trigger when page dominates the viewport
 threshold: 0
 });

 useEffect(() => {
 if (isVisible) onVisible(pageNum);
 }, [isVisible, pageNum, onVisible]);

 const canvasRef = useRef<HTMLCanvasElement>(null);
 const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
 const textLayerRef = useRef<HTMLDivElement>(null);
 const [renderedScale, setRenderedScale] = useState(0);
 const [viewportDimensions, setViewportDimensions] = useState<{ width: number, height: number } | null>(null);

 const setRefs = useCallback((node: HTMLDivElement | null) => {
 ref(node);
 visibleRef(node);
 }, [ref, visibleRef]);

 useEffect(() => {
 let renderTask: pdfjsLib.RenderTask | null = null;
 let cancelled = false;

 const renderPage = async () => {
 if (!inView || !pdfDoc || scale === 0) return;
 if (renderedScale === scale) return;

 try {
 const page = await pdfDoc.getPage(pageNum);
 if (cancelled) return;

 const viewport = page.getViewport({ scale });
 const canvas = canvasRef.current;
 const context = canvas?.getContext("2d", { alpha: false });
 if (!canvas || !context) return;

 canvas.height = viewport.height;
 canvas.width = viewport.width;

 renderTask = page.render({
 canvasContext: context,
 viewport: viewport,
 } as any);

 await renderTask.promise;
 if (cancelled) return;

 setRenderedScale(scale);
 setViewportDimensions({ width: viewport.width, height: viewport.height });

 // Render Annotations
 const annCanvas = annotationCanvasRef.current;
 if (annCanvas) {
 const annCtx = annCanvas.getContext("2d");
 if (annCtx) {
 annCanvas.width = viewport.width;
 annCanvas.height = viewport.height;
 annCtx.clearRect(0, 0, annCanvas.width, annCanvas.height);

 annotations.forEach(stroke => {
 if (stroke.points.length < 2) return;
 annCtx.beginPath();
 annCtx.strokeStyle = stroke.color;
 annCtx.lineWidth = stroke.width || (stroke.type ==="highlighter" ? 15 : 2);
 annCtx.lineCap ="round";
 annCtx.lineJoin ="round";
 annCtx.globalAlpha = stroke.type ==="highlighter" ? 0.3 : 1;

 const firstPoint = stroke.points[0];
 annCtx.moveTo(firstPoint.x * viewport.width, firstPoint.y * viewport.height);

 stroke.points.slice(1).forEach(p => {
 annCtx.lineTo(p.x * viewport.width, p.y * viewport.height);
 });
 annCtx.stroke();
 });
 annCtx.globalAlpha = 1;
 }
 }

 // Render Text Layer
 if (textLayerRef.current) {
 const textLayerDiv = textLayerRef.current;
 textLayerDiv.innerHTML ='';
 textLayerDiv.style.width = `${viewport.width}px`;
 textLayerDiv.style.height = `${viewport.height}px`;

 const textContent = await page.getTextContent();

 const textLayer = new TextLayer({
 textContentSource: textContent,
 container: textLayerDiv,
 viewport: viewport,
 });
 await textLayer.render();
 }

 } catch (err) {
 if (err instanceof Error && err.name !=="RenderingCancelledException") {
 console.error(`Page ${pageNum} render error:`, err);
 }
 }
 };

 renderPage();

 return () => {
 cancelled = true;
 if (renderTask) {
 renderTask.cancel();
 }
 };
 }, [inView, pdfDoc, pageNum, scale, annotations, renderedScale]);

 const estimatedWidth ='100%';
 const estimatedAspectRatio = aspectRatio ? aspectRatio : 1 / 1.414; // Default to A4 approx

 return (
 <div
 ref={setRefs}
 className={`relative mb-6 border shadow-xl bg-white dark:bg-black transition-colors duration-300 rounded-xl overflow-hidden ${isActive ?'border-primary ring-2 ring-primary/20' :'border-border dark:border-white/10'}`}
 style={{ width: estimatedWidth, aspectRatio: estimatedAspectRatio }}
 id={`pdf-page-${pageNum}`}
 >
 {inView ? (
 <>
 <canvas ref={canvasRef} className="w-full h-full" />
 <div
 ref={textLayerRef}
 className="textLayer absolute inset-0 z-[5] selection:bg-blue-300/40"
 />
 <canvas
 ref={annotationCanvasRef}
 className="absolute inset-0 pointer-events-none z-10 w-full h-full"
 />

 {viewportDimensions && textNotes?.map(note => (
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
 </>
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground">
 <span className="opacity-50 font-bold text-lg">Page {pageNum}</span>
 </div>
 )}
 </div>
 );
};

export function PdfViewer({ url, pageNum, onPageChange, noteId, versionId, onDoubleClick, onMaximize, onCanvasReady, enableShortcuts = true }: PdfViewerProps) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
 const [scale, setScale] = useState(1.0);
 const [aspectRatio, setAspectRatio] = useState<number | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [annotations, setAnnotations] = useState<Record<number, Stroke[]>>({});
 const [textNotes, setTextNotes] = useState<Record<number, TextNote[]>>({});
 const [activePage, setActivePage] = useState(pageNum);

 const { data: savedAnnotations } = api.notes.getAnnotations.useQuery(
 { versionId: versionId ||"" },
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
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setTextNotes(textNotesData);
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setAnnotations(strokesData);
 }
 }, [savedAnnotations]);

 useEffect(() => {
 let isCancelled = false;
 const loadPdf = async () => {
 try {
 if (!url) return;
 setLoading(true);
 setError(null);

 const loadingTask = pdfjsLib.getDocument(url);
 const doc = await loadingTask.promise;

 // Fetch first page to determine aspect ratio for all pages
 const page1 = await doc.getPage(1);
 const viewport1 = page1.getViewport({ scale: 1.0 });
 if (!isCancelled) {
 setAspectRatio(viewport1.width / viewport1.height);
 setPdfDoc(doc);
 setLoading(false);
 } else {
 doc.destroy();
 }
 } catch (err) {
 if (!isCancelled) {
 console.error("Failed to load PDF", err);
 setError("Failed to load PDF");
 setLoading(false);
 }
 }
 };

 loadPdf();
 return () => { isCancelled = true; };
 }, [url]);

 const updateScale = useCallback(async (availableWidth: number) => {
 if (!pdfDoc) return;
 try {
 const page = await pdfDoc.getPage(1);
 const viewport = page.getViewport({ scale: 1.0 });
 const newScale = (availableWidth - 40) / viewport.width;
 setScale(prev => Math.abs(prev - newScale) < 0.05 ? prev : newScale);
 } catch (e) { console.error(e); }
 }, [pdfDoc]);

 useEffect(() => {
 if (!containerRef.current) return;
 let timeoutId: NodeJS.Timeout;
 const resizeObserver = new ResizeObserver((entries) => {
 window.requestAnimationFrame(() => {
 if (!Array.isArray(entries) || !entries.length) return;
 const entry = entries[0];
 clearTimeout(timeoutId);
 timeoutId = setTimeout(() => {
 if (entry.contentRect.width > 0) {
 updateScale(entry.contentRect.width);
 }
 }, 100);
 });
 });
 resizeObserver.observe(containerRef.current);
 return () => {
 resizeObserver.disconnect();
 clearTimeout(timeoutId);
 };
 }, [updateScale]);

 // External page changes (e.g. from thumbnail click)
 useEffect(() => {
 if (pageNum !== activePage) {
 const pageElement = document.getElementById(`pdf-page-${pageNum}`);
 if (pageElement) {
 pageElement.scrollIntoView({ behavior:'smooth', block:'start' });
 }
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setActivePage(pageNum);
 }
 }, [pageNum, activePage]);

 const handleVisiblePageChange = useCallback((page: number) => {
 if (activePage !== page) {
 setActivePage(page);
 onPageChange(page);
 }
 }, [activePage, onPageChange]);

 const changePage = useCallback((offset: number) => {
 if (!pdfDoc) return;
 const target = Math.min(Math.max(activePage + offset, 1), pdfDoc.numPages);
 onPageChange(target); // This will trigger the scroll effect
 }, [activePage, pdfDoc, onPageChange]);

 const [pageJumpInput, setPageJumpInput] = useState("");
 const handlePageJump = useCallback(() => {
 const targetPage = parseInt(pageJumpInput, 10);
 if (pdfDoc && !isNaN(targetPage) && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
 onPageChange(targetPage);
 setPageJumpInput("");
 }
 }, [pageJumpInput, pdfDoc, onPageChange]);

 useEffect(() => {
 if (onCanvasReady) {
 const getImageData = () => {
 const canvas = document.querySelector(`#pdf-page-1 canvas`) as HTMLCanvasElement;
 if (!canvas) return null;
 const dataUrl = canvas.toDataURL('image/png');
 return dataUrl.split(',')[1] || null;
 };
 onCanvasReady(getImageData);
 }
 }, [onCanvasReady, pdfDoc, scale]);

 const { data: bookmarks, refetch: refetchBookmarks } = api.interactions.bookmarks.getForNote.useQuery(
 { noteId: noteId! },
 { enabled: !!noteId }
 );

 const toggleBookmarkMutation = api.interactions.bookmarks.toggle.useMutation({
 onSuccess: () => refetchBookmarks(),
 onError: () => alert('Failed to toggle bookmark. Please sign in.'),
 });

 const isCurrentPageBookmarked = bookmarks?.some((b: { pageNumber: number }) => b.pageNumber === activePage);

 const handleToggleBookmark = useCallback(() => {
 if (!noteId) return;
 toggleBookmarkMutation.mutate({ noteId, pageNumber: activePage });
 }, [noteId, activePage, toggleBookmarkMutation]);

 useEffect(() => {
 if (!enableShortcuts) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
 switch (e.key.toLowerCase()) {
 case"arrowleft": changePage(-1); break;
 case"arrowright": changePage(1); break;
 case"b": handleToggleBookmark(); break;
 }
 };
 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [changePage, handleToggleBookmark, enableShortcuts]);

 if (error) return <div className="text-red-500 font-bold p-4 bg-red-100 rounded-lg">{error}</div>;

 const pages = pdfDoc ? Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1) : [];

 return (
 <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
 {loading && <div className="animate-pulse text-muted-foreground p-8">Loading document...</div>}

 <div
 ref={containerRef}
 className="w-full"
 onDoubleClick={onDoubleClick}
 >
 {pages.map(pNum => (
 <PdfPageRenderer
 key={pNum}
 pdfDoc={pdfDoc!}
 pageNum={pNum}
 scale={scale}
 aspectRatio={aspectRatio!}
 annotations={annotations[pNum] || []}
 textNotes={textNotes[pNum] || []}
 onVisible={handleVisiblePageChange}
 setTextNotes={setTextNotes}
 isActive={activePage === pNum}
 />
 ))}
 </div>

 {/* Controls */}
 {!loading && pdfDoc && (
 <div className="sticky bottom-6 z-50 space-y-4 w-full px-2 sm:px-4">
 <div className="flex gap-2 sm:gap-3 items-center justify-center flex-wrap bg-card/80 border border-border shadow-xl rounded-full p-3 sm:p-4">
 <button
 onClick={() => changePage(-1)}
 disabled={activePage <= 1}
 className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all shadow-md disabled:opacity-30 active:scale-95"
 >
 Previous
 </button>

 <div className="flex items-center gap-2">
 <input
 type="number"
 value={pageJumpInput}
 onChange={(e) => setPageJumpInput(e.target.value)}
 onKeyDown={(e) => e.key ==="Enter" && handlePageJump()}
 placeholder="#"
 className="w-16 px-3 py-2.5 rounded-full text-center text-sm bg-background border border-input focus:ring-2 focus:ring-primary outline-none transition-all"
 />
 <button
 onClick={handlePageJump}
 className="px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
 >
 Jump
 </button>
 </div>

 <div className="px-6 py-2.5 rounded-full bg-background border border-border">
 <span className="text-sm font-black text-foreground">
 {activePage} <span className="text-muted-foreground">/</span> {pdfDoc?.numPages ||"--"}
 </span>
 </div>

 <button
 onClick={() => changePage(1)}
 disabled={activePage >= (pdfDoc.numPages || 0)}
 className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all shadow-md disabled:opacity-30 active:scale-95"
 >
 Next
 </button>

 {onMaximize && (
 <button
 onClick={onMaximize}
 className="p-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all shadow-md active:scale-95"
 title="Focus Mode"
 >
 <Maximize className="w-4 h-4" />
 </button>
 )}

 {noteId && (
 <button
 onClick={handleToggleBookmark}
 disabled={toggleBookmarkMutation.isPending}
 className={`p-3 rounded-full transition-all shadow-md active:scale-95 border ${isCurrentPageBookmarked
 ?"bg-primary/20 border-primary/50 text-primary"
 :"bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
 }`}
 >
 <Bookmark className={`w-4 h-4 ${isCurrentPageBookmarked ?"fill-primary" :""}`} />
 </button>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
