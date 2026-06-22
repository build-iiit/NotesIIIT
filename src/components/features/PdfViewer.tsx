import { useEffect, useRef, useState, useCallback } from"react";
import * as pdfjsLib from"pdfjs-dist";
import { Bookmark, Maximize } from"lucide-react";
import { api } from"@/app/_trpc/client";
import { TextNoteOverlay } from"../annotations/TextNoteOverlay";
import { Stroke, TextNote, PageAnnotations } from"../annotations/types";

// Initialize worker globally at module-level to prevent reload rendering race conditions
if (typeof window !=="undefined") {
 pdfjsLib.GlobalWorkerOptions.workerSrc ="/pdf.worker.min.mjs";
}

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

export function PdfViewer({ url, pageNum, onPageChange, noteId, versionId, onDoubleClick, onMaximize, onCanvasReady, enableShortcuts = true }: PdfViewerProps) {
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

 const { data: currentUser } = api.auth.getMe.useQuery(undefined, {
 refetchOnWindowFocus: false,
 });

 // Fetch saved annotations from tRPC
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
 ctx.lineWidth = stroke.width || (stroke.type ==="highlighter" ? 15 : 2);
 ctx.lineCap ="round";
 ctx.lineJoin ="round";
 ctx.globalAlpha = stroke.type ==="highlighter" ? 0.3 : 1;

 const firstPoint = stroke.points[0];
 ctx.moveTo(firstPoint.x * viewport.width, firstPoint.y * viewport.height);

 stroke.points.slice(1).forEach((p: any) => {
 ctx.lineTo(p.x * viewport.width, p.y * viewport.height);
 });
 ctx.stroke();
 });
 ctx.globalAlpha = 1;
 }, [annotations, pageNum]);

 // 1. Load PDF Document
 useEffect(() => {
 let loadingTask: { promise: Promise<pdfjsLib.PDFDocumentProxy>; destroy: () => Promise<void> } | null = null;
 let isCancelled = false;

 const loadPdf = async () => {
 try {
 if (!url) return;
 console.log(`[PdfViewer] Starting load for URL: ${url}`);
 setLoading(true);
 setError(null);

 loadingTask = pdfjsLib.getDocument(url);
 const doc = await loadingTask.promise;
 console.log(`[PdfViewer] Document loaded successfully. Pages: ${doc.numPages}`);

 if (!isCancelled) {
 setPdfDoc(doc);
 setLoading(false);
 } else {
 console.log(`[PdfViewer] Load cancelled, destroying document.`);
 doc.destroy();
 }
 } catch (err) {
 if (!isCancelled) {
 console.error("[PdfViewer] Error loading PDF:", err);
 setError("Failed to load PDF");
 setLoading(false);
 }
 }
 };

 loadPdf();

 return () => {
 isCancelled = true;
 if (loadingTask) {
 loadingTask.destroy().catch(console.error);
 }
 };
 }, [url]);

 // 2. Handle Responsive Scaling
 const updateScale = useCallback(async (availableWidth: number) => {
 if (!pdfDoc) return;
 try {
 const page = await pdfDoc.getPage(pageNum);
 const viewport = page.getViewport({ scale: 1.0 });
 // Add padding to prevent tight fit causing layout shifts
 const newScale = (availableWidth - 40) / viewport.width;

 // Debounce/Threshold check to prevent infinite loops (Site breaking issue)
 setScale(prev => {
 if (Math.abs(prev - newScale) < 0.05) return prev;
 return newScale;
 });
 } catch (e) { console.error(e); }
 }, [pdfDoc, pageNum]);

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

 // 3. Render Page with proper cancellation handling
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
 if (err instanceof Error && err.name !=="RenderingCancelledException") {
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

 // 4. Redraw annotations when they change
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

 // 5. Expose canvas capture function to parent
 useEffect(() => {
 if (onCanvasReady && canvasRef.current) {
 const getImageData = () => {
 const canvas = canvasRef.current;
 if (!canvas) return null;
 const dataUrl = canvas.toDataURL('image/png');
 return dataUrl.split(',')[1] || null;
 };
 onCanvasReady(getImageData);
 }
 }, [onCanvasReady, pageNum, scale]);

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
 if (!currentUser) {
 window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
 return;
 }
 if (!noteId) return;
 toggleBookmarkMutation.mutate({ noteId, pageNumber: pageNum });
 }, [noteId, pageNum, toggleBookmarkMutation, currentUser]);

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

 return (
 <div
 ref={containerRef}
 className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto"
 >
 {loading && <div className="animate-pulse text-gray-500">Loading document...</div>}

 <div
 className="relative border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-zinc-950"
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

 {/* Controls - Minimalist Solid Theme */}
 <div className="space-y-4 w-full px-2 sm:px-4">
 <div className="flex gap-2 sm:gap-3 items-center justify-center flex-wrap bg-zinc-950 rounded-3xl p-3 sm:p-5 border border-zinc-800 shadow-xl">
 <button
 onClick={() => changePage(-1)}
 disabled={pageNum <= 1}
 className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800 shadow-sm disabled:opacity-30 active:scale-95"
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
 className="w-16 px-3 py-2.5 rounded-xl text-center text-sm bg-zinc-900 border border-zinc-800 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-white"
 />
 <button
 onClick={handlePageJump}
 className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
 >
 Jump
 </button>
 </div>

 <div className="px-6 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
 <span className="text-sm font-black text-gray-300">
 {pageNum} <span className="text-gray-400">/</span> {pdfDoc?.numPages ||"--"}
 </span>
 </div>

 <button
 onClick={() => changePage(1)}
 disabled={!pdfDoc || pageNum >= (pdfDoc.numPages || 0)}
 className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800 shadow-sm disabled:opacity-30 active:scale-95"
 >
 Next
 </button>

 {onMaximize && (
 <button
 onClick={onMaximize}
 className="p-2.5 rounded-2xl text-gray-100 bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800 shadow-sm active:scale-95"
 title="Focus Mode"
 >
 <Maximize className="w-5 h-5" />
 </button>
 )}

 {noteId && (
 <button
 onClick={handleToggleBookmark}
 disabled={toggleBookmarkMutation.isPending}
 className={`p-3 rounded-2xl border transition-all ${isCurrentPageBookmarked
 ?"bg-primary/10 border-primary/30"
 :"bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
 }`}
 >
 <Bookmark className={`w-5 h-5 ${isCurrentPageBookmarked ?"fill-primary text-primary" :"text-gray-400"}`} />
 </button>
 )}
 </div>

 {/* Bookmarks List Overlay */}
 {noteId && bookmarks && bookmarks.length > 0 && (
 <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
 <div className="flex items-center gap-2 mb-4">
 <Bookmark className="w-5 h-5 text-primary" />
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
 ?"bg-primary text-primary-foreground border-primary shadow-lg scale-105"
 :"bg-zinc-50 dark:bg-zinc-900 text-gray-650 dark:text-gray-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
