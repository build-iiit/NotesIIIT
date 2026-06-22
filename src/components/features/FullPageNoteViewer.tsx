"use client";

import { useEffect, useRef, useState, useCallback } from"react";
import * as pdfjsLib from"pdfjs-dist";
import { v4 as uuidv4 } from"uuid";
import {
 X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Info,
 Pen, Eraser, RotateCcw, Highlighter, StickyNote, ChevronDown, ChevronUp, Plus, Save, Square, Circle, Minus, MoveUpRight, Download, Search
} from"lucide-react";
import { api } from"@/app/_trpc/client";
import { Point, Stroke, TextNote, PageAnnotations } from"@/components/annotations/types";
import { TextNoteOverlay } from"@/components/annotations/TextNoteOverlay";
import { VirtualPage } from"./VirtualPage";
import { exportAnnotatedPdf } from"@/lib/pdfExport";
import { ShapeType } from"@/components/annotations/types";
import { UnifiedAnnotationToolbar } from"@/components/annotations/UnifiedAnnotationToolbar";

// Use local worker copy (copied by scripts/copy-pdf-worker.js at build time)
pdfjsLib.GlobalWorkerOptions.workerSrc ="/pdf.worker.min.mjs";

interface FullPageNoteViewerProps {
 url: string;
 initialPage?: number;
 isOpen: boolean;
 onClose: (pageNumber?: number) => void;
 noteTitle?: string;
 versionId: string;
}

type ZoomMode ="fit-width" |"fit-height" |"custom";
type Tool ="pen" |"eraser" |"highlighter" |"text" |"shape";


const COLORS = [
 { name:"Black", value:"#000000" },
 { name:"Red", value:"#FF0000" },
 { name:"Blue", value:"#0000FF" },
 { name:"Green", value:"#008000" },
 { name:"Purple", value:"#800080" },
];

const HIGHLIGHT_COLORS = [
 { name:"Yellow", value:"rgba(255, 255, 0, 0.3)" },
 { name:"Green", value:"rgba(76, 175, 80, 0.3)" },
 { name:"Pink", value:"rgba(233, 30, 99, 0.3)" },
 { name:"Blue", value:"rgba(33, 150, 243, 0.3)" },
 { name:"Orange", value:"rgba(255, 152, 0, 0.3)" },
];

const TEXT_COLORS = [
 { name:"Black", value:"#000000" },
 { name:"Blue", value:"#2563eb" },
 { name:"Red", value:"#dc2626" },
 { name:"Green", value:"#16a34a" },
 { name:"Purple", value:"#9333ea" },
 { name:"Orange", value:"#ea580c" },
 { name:"Yellow", value:"#facc15" },
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
 const [shape, setShape] = useState<ShapeType>("rect");
 const [searchQuery, setSearchQuery] = useState("");
 const [activePage, setActivePage] = useState(initialPage);
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
 const [pageInputValue, setPageInputValue] = useState("");
 const [isPageInputFocused, setIsPageInputFocused] = useState(false);

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

 // eslint-disable-next-line react-hooks/set-state-in-effect
 setAnnotations(strokesData);
 setTextNotes(textNotesData);
 setUnsavedChanges(false);
 setHistory({});
 setFuture({});
 }
 }, [savedAnnotations]);

 useEffect(() => {
 if (isOpen) {
 setPageNum(initialPage);
 }
 }, [isOpen, initialPage]);

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
 setIsAnimatingIn(true);
 document.documentElement.style.overflow ='hidden';
 document.body.style.overflow ='hidden';
 } else {
 setIsAnimatingIn(false);
 document.documentElement.style.overflow ='';
 document.body.style.overflow ='';
 }
 return () => {
 document.documentElement.style.overflow ='';
 document.body.style.overflow ='';
 };
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
 if (zoomMode ==="fit-width") {
 newScale = availableWidth / viewport.width;
 } else if (zoomMode ==="fit-height") {
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
 // eslint-disable-next-line react-hooks/set-state-in-effect
 if (zoomMode !=="custom") void updateScale();
 }, [updateScale, zoomMode]);

 useEffect(() => {
 if (!isOpen) return;
 const handleResize = () => { if (zoomMode !=="custom") updateScale(); };
 window.addEventListener("resize", handleResize);
 return () => window.removeEventListener("resize", handleResize);
 }, [isOpen, updateScale, zoomMode]);

 // Render Page
 useEffect(() => {
 const renderPage = async () => {
 if (!pdfDoc || !canvasRef.current || scale === 0) return;
 if (renderTaskRef.current) renderTaskRef.current.cancel();

 // Save scroll position BEFORE render
 const container = containerRef.current;
 const scrollRatio = container ? {
 x: container.scrollWidth > 0 ? container.scrollLeft / container.scrollWidth : 0,
 y: container.scrollHeight > 0 ? container.scrollTop / container.scrollHeight : 0
 } : null;

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

 // Restore scroll position AFTER render
 if (container && scrollRatio && zoomMode ==="custom") {
 requestAnimationFrame(() => {
 container.scrollLeft = scrollRatio.x * container.scrollWidth;
 container.scrollTop = scrollRatio.y * container.scrollHeight;
 });
 }
 } catch (err: unknown) {
 if (err instanceof Error && err.name !=="RenderingCancelledException") {
 console.error("Render error:", err);
 }
 }
 };
 renderPage();
 }, [pdfDoc, pageNum, scale, zoomMode]);

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
 const drawStroke = (points: Point[], color: string, strokeType:"pen" |"highlighter", width_val?: number) => {
 if (points.length < 2) return;
 ctx.beginPath();
 ctx.lineWidth = width_val || (strokeType ==="highlighter" ? 20 : 2);
 ctx.lineJoin ='round';
 ctx.lineCap ='round';
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
 const strokeColor = tool ==='highlighter' ? highlightColor : penColor;
 const strokeType = tool ==='highlighter' ?"highlighter" :"pen";
 const strokeWidth = tool ==='highlighter' ? highlightWidth : penWidth;
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
 const x = (e.clientX - rect.left) / rect.width; // 0-1
 const y = (e.clientY - rect.top) / rect.height; // 0-1

 // Clamp to 0-1 to ensure we don't draw outside PDF bounds logically
 return {
 x: Math.max(0, Math.min(x, 1)),
 y: Math.max(0, Math.min(y, 1))
 };
 };

 const handleVirtualPointerDown = (e: React.PointerEvent, pNum: number, point: Point) => {
 if (tool ==='pen' || tool ==='highlighter' || tool ==='shape') {
 setCurrentStroke([point]);
 } else if (tool ==='eraser') {
 setIsErasing(true);
 addToHistory(pNum);
 performErase(point, pNum);
 }
 };
 
 const handleVirtualTextNoteClick = (e: React.PointerEvent, pNum: number, point: Point) => {
 const newNote: TextNote = {
 id: uuidv4(), x: point.x, y: point.y, content:"", color: textColor, bold: textBold,
 italic: textItalic, underline: textUnderline, width: 0.3, fontSize: textFontSize,
 displayMode:"open", collapsed: false, createdAt: Date.now(), updatedAt: Date.now()
 };
 setTextNotes(prev => ({ ...prev, [pNum]: [...(prev[pNum] || []), newNote] }));
 setEditingNote({ pageNum: pNum, noteId: newNote.id });
 setUnsavedChanges(true);
 };

 const handlePointerDown = (e: React.PointerEvent) => {
 const point = getPoint(e);
 if (!point) return;

 if (tool ==='pen' || tool ==='highlighter') {
 setCurrentStroke([point]);
 } else if (tool ==='eraser') {
 setIsErasing(true);
 addToHistory(pageNum); // Save state before erasing session
 performErase(point);
 } else if (tool ==='text') {
 handleCanvasClick(e);
 }
 };

 const performErase = (p: Point, pNum: number = pageNum) => {
 setAnnotations(prev => {
 const pageStrokes = prev[pNum] || [];
 const radius = 0.02;
 const remaining = pageStrokes.filter(stroke => !stroke.points.some(sp => Math.abs(sp.x - p.x) < radius && Math.abs(sp.y - p.y) < radius));
 if (remaining.length !== pageStrokes.length) {
 setUnsavedChanges(true);
 return { ...prev, [pNum]: remaining };
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

 const handleVirtualPointerMove = (e: React.PointerEvent, pNum: number, point: Point) => {
 if (e.buttons !== 1) return;
 if (tool ==='pen' || tool ==='highlighter' || tool ==='shape') {
 setCurrentStroke(prev => prev ? [...prev, point] : [point]);
 } else if (tool ==='eraser' && isErasing) {
 performErase(point, pNum);
 }
 };

 const handlePointerMove = (e: React.PointerEvent) => {
 if (e.buttons !== 1) return;
 const point = getPoint(e);
 if (!point) return;

 if (tool ==='pen' || tool ==='highlighter') {
 setCurrentStroke(prev => prev ? [...prev, point] : [point]);
 } else if (tool ==='eraser' && isErasing) {
 performErase(point);
 }
 };

 const handleVirtualPointerUp = (e: React.PointerEvent, pNum: number) => {
 if ((tool ==='pen' || tool ==='highlighter' || tool ==='shape') && currentStroke) {
 if (currentStroke.length > 1) {
 addToHistory(pNum);
 const strokeColor = tool ==='highlighter' ? highlightColor : penColor;
 const strokeType = tool ==='highlighter' ?"highlighter" :"pen";
 const strokeWidth = tool ==='highlighter' ? highlightWidth : penWidth;
 setAnnotations(prev => ({
 ...prev,
 [pNum]: [...(prev[pNum] || []), {
 points: currentStroke,
 color: strokeColor,
 type: strokeType,
 shape: tool ==='shape' ? shape :"freehand",
 width: strokeWidth
 }]
 }));
 setUnsavedChanges(true);
 }
 setCurrentStroke(null);
 }
 if (tool ==='eraser') setIsErasing(false);
 };

 const handlePointerUp = () => {
 if ((tool ==='pen' || tool ==='highlighter') && currentStroke) {
 if (currentStroke.length > 1) {
 addToHistory(pageNum);
 const strokeColor = tool ==='highlighter' ? highlightColor : penColor;
 const strokeType = tool ==='highlighter' ?"highlighter" :"pen";
 const strokeWidth = tool ==='highlighter' ? highlightWidth : penWidth;
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
 if (tool ==='eraser') {
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
 [pageNum]: (prev[pageNum] || []).map(note => {
 if (note.id !== id) return note;

 // Cycle: open -> collapsed-line -> collapsed-icon -> open
 const currentMode = note.displayMode || (note.collapsed ?'collapsed-icon' :'open');
 let nextMode:"open" |"collapsed-line" |"collapsed-icon" ="open";

 if (currentMode ==='open') nextMode ='collapsed-line';
 else if (currentMode ==='collapsed-line') nextMode ='collapsed-icon';
 else nextMode ='open';

 return {
 ...note,
 displayMode: nextMode,
 collapsed: nextMode ==='collapsed-icon', // For compatibility
 updatedAt: Date.now()
 };
 })
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
 if (tool !=='text') return;

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
 content:"",
 color: textColor,
 bold: textBold,
 italic: textItalic,
 underline: textUnderline,
 width: 0.3, // 30% of page width default
 fontSize: textFontSize,
 displayMode:"open",
 collapsed: false,
 createdAt: Date.now(),
 updatedAt: Date.now()
 };

 setTextNotes(prev => ({
 ...prev,
 [pageNum]: [...(prev[pageNum] || []), newNote]
 }));
 setEditingNote({ pageNum, noteId: newNote.id });
 setUnsavedChanges(true); // Crucial fix: Mark changes as unsaved immediately
 };

 // -------------------------------------------------------------------------
 // CLOSE LOGIC
 // -------------------------------------------------------------------------

 const handleCloseRequest = () => {
 if (unsavedChanges) {
 setShowSavePrompt(true);
 } else {
 onClose(pageNum);
 }
 };

 
 const [isExporting, setIsExporting] = useState(false);
 const handleDownload = async () => {
 if (!pdfDoc) return;
 try {
 setIsExporting(true);
 const response = await fetch(url);
 const pdfBytes = await response.arrayBuffer();
 const newBytes = await exportAnnotatedPdf(pdfBytes, annotations, textNotes);
 const blob = new Blob([newBytes as any], { type:"application/pdf" });
 const downloadUrl = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = downloadUrl;
 a.download = `${noteTitle ||'annotated_note'}.pdf`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(downloadUrl);
 } catch (err) {
 console.error("Export failed", err);
 alert("Failed to export PDF.");
 } finally {
 setIsExporting(false);
 }
 };

 const handleSaveOnly = async () => {
 if (!versionId) return;

 // Get all unique page numbers from both annotations and textNotes
 const allPages = new Set([
 ...Object.keys(annotations),
 ...Object.keys(textNotes)
 ]);

 const promises = Array.from(allPages).map(pNum => {
 const pNumber = parseInt(pNum);
 return saveMutation.mutateAsync({
 versionId,
 pageNumber: pNumber,
 content: {
 strokes: annotations[pNumber] || [],
 textNotes: textNotes[pNumber] || []
 }
 });
 });

 try {
 await Promise.all(promises);
 setUnsavedChanges(false);
 utils.notes.getAnnotations.invalidate({ versionId });
 } catch (error) {
 console.error("Failed to save annotations:", error);
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
 onClose(pageNum);
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
 onClose(pageNum); // Exit without saving
 };

 // -------------------------------------------------------------------------
 // CONTROLS & HELPERS
 // -------------------------------------------------------------------------

 const resetControls = useCallback(() => {
 setShowControls(true);
 if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
 // Don't hide if page input is focused
 if (!isPageInputFocused) {
 hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
 }
 }, [isPageInputFocused]);

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
 if ((e.target as HTMLElement).tagName ==='INPUT' || (e.target as HTMLElement).tagName ==='TEXTAREA') return;

 if (e.key ==="Escape") handleCloseRequest();
 if (e.key ==="ArrowLeft") changePage(-1);
 if (e.key ==="ArrowRight") changePage(1);
 // Undo/Redo shortcuts
 if ((e.ctrlKey || e.metaKey) && e.key ==='z') {
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
 className={`fixed inset-0 z-50 bg-black/95 transition-opacity duration-300 ${isAnimatingIn ?"opacity-100" :"opacity-0"}`}
 onMouseDown={(e) => {
 // Only close if clicking backdrop specifically (and not drawing)
 if (e.target === e.currentTarget && !showSavePrompt) handleCloseRequest();
 }}
 >
 {/* --- SAVE PROMPT (Home Page Theme Alignment) --- */}
 {showSavePrompt && (
 <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60">
 <div className="relative group overflow-hidden bg-white/80 dark:bg-zinc-900/60 p-10 rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.5)] max-w-md w-full border border-white/40 dark:border-white/10 animate-in fade-in zoom-in-95 duration-500">
 {/* Subtle Home Page Themed Gradients */}
 <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
 <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

 <div className="relative z-10 text-center">
 <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-gradient-to-br from-white/20 via-white/5 to-white/10 dark:from-white/10 dark:via-transparent dark:to-white/5 flex items-center justify-center shadow-xl border border-white/40 dark:border-white/10">
 <Save className="w-12 h-12 text-gray-800 dark:text-gray-100 drop-shadow-sm" />
 </div>

 <h3 className="text-3xl font-black mb-4 text-gray-900 dark:text-white tracking-tight">Preserve your work?</h3>
 <p className="text-gray-600 dark:text-gray-300 mb-10 text-lg font-medium leading-relaxed px-4">
 Ready to save your annotations and sync them with the cloud?
 </p>

 <div className="flex flex-col gap-4">
 <button
 onClick={handleSaveExit}
 className="w-full py-5 rounded-2xl transition-all border shadow-2xl bg-primary/10 dark:bg-primary/5 border-primary/40 text-primary font-black hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-[1.03] hover:shadow-primary/30 active:scale-95 uppercase tracking-[0.2em] text-xs"
 >
 {saveMutation.isPending ?"Syncing..." :"Save & Exit"}
 </button>

 <div className="flex gap-4 px-2">
 <button
 onClick={handleDiscardExit}
 className="flex-1 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-2xl border border-red-500/10 hover:border-red-500/20 transition-all active:scale-95 text-sm"
 >
 Discard
 </button>
 <button
 onClick={() => setShowSavePrompt(false)}
 className="flex-1 py-4 bg-gray-500/5 hover:bg-gray-500/10 text-gray-600 dark:text-gray-400 font-bold rounded-2xl border border-gray-500/10 hover:border-gray-500/20 transition-all active:scale-95 text-sm"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* --- TOP BAR --- */}
 <div className={`absolute top-0 left-0 right-20 z-40 p-6 bg-gradient-to-b from-black/60 to-transparent transition-all duration-200 ${showControls ?"opacity-100 translate-y-0" :"opacity-0 -translate-y-4 pointer-events-none"}`}>
 {noteTitle && <h2 className="text-white text-xl font-bold">{noteTitle}</h2>}
 </div>

 {/* --- TOP RIGHT BUTTONS --- */}
 <div className="absolute top-6 right-6 z-50 flex gap-3">
 <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 shadow-2xl">
 <Search className="w-4 h-4 text-white/50" />
 <input 
 type="text" 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyDown={(e) => {
 if (e.key ==='Enter') {
 if (searchQuery) (window as any).find(searchQuery);
 }
 }}
 placeholder="Search..." 
 className="bg-transparent border-none text-white text-sm focus:ring-0 w-32 px-2 py-2 placeholder-white/30"
 />
 <button 
 onClick={() => (window as any).find(searchQuery)}
 className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
 >
 <ChevronDown className="w-4 h-4" />
 </button>
 </div>
 <button
 onClick={handleSaveOnly}
 disabled={!unsavedChanges || saveMutation.isPending}
 className={`p-3.5 rounded-[1.25rem] transition-all flex items-center gap-3 group border shadow-2xl ${unsavedChanges
 ?"bg-primary/10 dark:bg-primary/5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:scale-[1.05] hover:shadow-primary/20"
 :"bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
 }`}
 title="Save Annotations"
 >
 <Save className={`w-6 h-6 ${saveMutation.isPending ?"animate-spin-slow" :"group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"}`} />
 <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-500 text-xs font-black uppercase tracking-widest whitespace-nowrap">
 {saveMutation.isPending ?"Syncing..." :"Save Now"}
 </span>
 </button>
 <button
 onClick={handleDownload}
 disabled={isExporting}
 className="p-3.5 bg-white/5 rounded-[1.25rem] hover:bg-blue-500/20 text-white/80 hover:text-blue-400 border border-white/10 hover:border-blue-500/30 transition-all shadow-2xl active:scale-90"
 title="Download PDF"
 >
 <Download className="w-6 h-6" />
 </button>
 <button
 onClick={handleCloseRequest}
 className="p-3.5 bg-white/5 rounded-[1.25rem] hover:bg-red-500/20 text-white/80 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all shadow-2xl active:scale-90"
 >
 <X className="w-6 h-6" />
 </button>
 </div>


 {/* --- MAIN CANVAS AREA --- */}
 <style jsx global>{`
 .custom-scrollbar::-webkit-scrollbar {
 width: 14px;
 height: 14px;
 }
 .custom-scrollbar::-webkit-scrollbar-track {
 background: transparent;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb {
 background-color: rgba(156, 163, 175, 0.5);
 border-radius: 7px;
 border: 3px solid transparent;
 background-clip: content-box;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
 background-color: rgba(107, 114, 128, 0.8);
 }
 .custom-scrollbar::-webkit-scrollbar-corner {
 background: transparent;
 }
 /* Firefox */
 .custom-scrollbar {
 scrollbar-width: thin;
 scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
 }
 `}</style>
 <div ref={containerRef} className="custom-scrollbar w-full h-full overflow-auto relative bg-neutral-100 dark:bg-neutral-900/50" onScroll={(e) => {
 const target = e.target as HTMLDivElement;
 const pageNodes = document.querySelectorAll('[data-page-number]');
 for (let i = 0; i < pageNodes.length; i++) {
 const rect = pageNodes[i].getBoundingClientRect();
 if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
 const p = parseInt(pageNodes[i].getAttribute('data-page-number') ||"1");
 if (p !== activePage) {
 setActivePage(p);
 setPageNum(p);
 }
 break;
 }
 }
 }}>
 {loading && <div className="text-gray-400 text-xl m-auto flex justify-center mt-20">Loading PDF...</div>}
 {error && <div className="text-red-400 text-xl m-auto flex justify-center mt-20">{error}</div>}

 {!loading && !error && pdfDoc && (
 <div className="flex flex-col items-center gap-8 py-20 pb-40 px-4">
 {Array.from({ length: pdfDoc.numPages }).map((_, idx) => (
 <VirtualPage
 key={idx}
 pageNum={idx + 1}
 pdfDoc={pdfDoc}
 scale={scale}
 zoomMode={zoomMode}
 containerWidth={containerRef.current?.clientWidth || window.innerWidth - 100}
 annotations={annotations[idx + 1] || []}
 textNotes={textNotes[idx + 1] || []}
 currentStroke={activePage === idx + 1 ? currentStroke : null}
 tool={tool}
 penColor={penColor}
 highlightColor={highlightColor}
 penWidth={penWidth}
 highlightWidth={highlightWidth}
 shape={shape}
 onPointerDown={(e, p, pt) => {
 if (p !== activePage) { setActivePage(p); setPageNum(p); }
 handleVirtualPointerDown(e, p, pt);
 }}
 onPointerMove={handleVirtualPointerMove}
 onPointerUp={handleVirtualPointerUp}
 onTextNoteClick={(e, p, pt) => {
 if (p !== activePage) { setActivePage(p); setPageNum(p); }
 handleVirtualTextNoteClick(e, p, pt);
 }}
 searchQuery={searchQuery}
 />
 ))}
 </div>
 )}
 </div>

 {/* --- BOTTOM TOOLBAR (Navigation & Zoom) --- */}
 <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-200 ${showControls ?"opacity-100 translate-y-0" :"opacity-0 translate-y-4 pointer-events-none"}`}>
 <div className="bg-white/10 dark:bg-black/40 rounded-full px-4 py-2 border border-white/20 dark:border-white/10 shadow-2xl flex items-center gap-4">

 {/* Navigation */}
 <div className="flex items-center gap-1 px-2 border-r border-white/20">
 <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-2 text-gray-800 dark:text-gray-100 hover:bg-white/20 rounded-full disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
 <div className="flex items-center gap-1">
 <input
 type="text"
 value={pageInputValue}
 onChange={(e) => {
 const val = e.target.value;
 if (val ==='' || /^\d+$/.test(val)) {
 setPageInputValue(val);
 }
 }}
 onFocus={() => {
 setIsPageInputFocused(true);
 setPageInputValue(pageNum.toString());
 setShowControls(true);
 if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
 }}
 onBlur={() => {
 setIsPageInputFocused(false);
 setPageInputValue("");
 }}
 onKeyDown={(e) => {
 e.stopPropagation(); // Stop event from reaching global listeners
 if (e.key ==='Enter' && pageInputValue) {
 const targetPage = parseInt(pageInputValue);
 if (pdfDoc && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
 setPageNum(targetPage);
 setPageInputValue("");
 setIsPageInputFocused(false);
 (e.target as HTMLInputElement).blur();
 } else {
 // Invalid page: keep current page, reset input
 setPageInputValue(pageNum.toString());
 }
 } else if (e.key ==='Escape') {
 setPageInputValue("");
 setIsPageInputFocused(false);
 (e.target as HTMLInputElement).blur();
 } else if (e.key ==='ArrowLeft' || e.key ==='ArrowRight') {
 e.stopPropagation(); // Allow cursor movement
 }
 }}
 className="w-12 text-gray-800 dark:text-gray-100 font-bold font-mono text-sm text-center bg-white/10 dark:bg-black/20 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-orange-400/50 border border-transparent hover:border-white/20"
 placeholder={pageNum.toString()}
 />
 <button
 onMouseDown={(e) => {
 e.preventDefault(); // Prevent input from losing focus immediately
 if (pageInputValue) {
 const targetPage = parseInt(pageInputValue);
 if (pdfDoc && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
 setPageNum(targetPage);
 setPageInputValue("");
 setIsPageInputFocused(false);
 }
 }
 }}
 className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/30 transition-all ${isPageInputFocused ?"opacity-100 w-auto ml-1" :"opacity-0 w-0 ml-0 pointer-events-none overflow-hidden border-0 p-0"}`}
 >
 GO
 </button>
 <span className="text-gray-800 dark:text-gray-100 font-bold font-mono text-sm">/</span>
 <span className="text-gray-800 dark:text-gray-100 font-bold font-mono text-sm">{pdfDoc?.numPages ||"-"}</span>
 </div>
 <button onClick={() => changePage(1)} disabled={!pdfDoc || pageNum >= pdfDoc.numPages} className="p-2 text-gray-800 dark:text-gray-100 hover:bg-white/20 rounded-full disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
 {/* Zoom */}
 <div className="flex items-center gap-1 px-2">
 <button onClick={() => { setZoomMode("custom"); setScale(s => Math.max(s - 0.2, 0.5)); }} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
 <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
 <button onClick={() => { setZoomMode("custom"); setScale(s => Math.min(s + 0.2, 5.0)); }} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
 <button onClick={() => setZoomMode(z => z ==="fit-width" ?"fit-height" :"fit-width")} className="p-2 text-white hover:bg-white/10 rounded-lg" title="Toggle Fit">
 {zoomMode ==="fit-width" ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
 </button>
 </div>
 </div>
 </div>

 
            {/* --- UNIFIED ANNOTATION TOOLBAR --- */}
            <div className="absolute right-8 bottom-8 z-50">
                <UnifiedAnnotationToolbar 
                    activeTool={tool === 'shape' ? 'shapes' : tool}
                    setActiveTool={(t) => {
                        if (t === 'shapes') setTool('shape');
                        else if (['pen', 'highlighter', 'eraser', 'text'].includes(t)) setTool(t as Tool);
                        else setTool('pen'); // Fallback
                    }}
                    activeColor={tool === 'highlighter' ? highlightColor : tool === 'text' ? textColor : penColor}
                    setActiveColor={(c) => {
                        if (tool === 'highlighter') setHighlightColor(c);
                        else if (tool === 'text') setTextColor(c);
                        else setPenColor(c);
                    }}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                />
            </div>
        </div>
        </div>
    );
}