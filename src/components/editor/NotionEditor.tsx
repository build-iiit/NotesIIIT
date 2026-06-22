"use client";

import { useEditor, EditorContent } from'@tiptap/react';
import StarterKit from'@tiptap/starter-kit';
import Placeholder from'@tiptap/extension-placeholder';
import Typography from'@tiptap/extension-typography';
import { useCallback, useEffect, useMemo, useState, useRef } from'react';

import { MathInline } from'./extensions/MathInline';
import { MathBlock } from'./extensions/MathBlock';
import { SlashCommand } from'./extensions/SlashCommand';
import'./EditorStyles.css';
import'katex/dist/katex.min.css';

import { Point, Stroke } from'../annotations/types';
import { UnifiedAnnotationToolbar } from'../annotations/UnifiedAnnotationToolbar';
import type { MarkdownDocument } from'@/types/markdownSchema';
import { EMPTY_DOCUMENT } from'@/types/markdownSchema';

// Hex to RGBA helper for highlighter
const hexToRgba = (hex: string, alpha: number) => {
 const r = parseInt(hex.slice(1, 3), 16) || 0;
 const g = parseInt(hex.slice(3, 5), 16) || 0;
 const b = parseInt(hex.slice(5, 7), 16) || 0;
 return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * NotionEditor - A Notion-style block-based editor using TipTap
 * 
 * Features:
 * - Block-based editing
 * - Slash command menu (/)
 * - Inline and block math with KaTeX
 * - Keyboard shortcuts
 * - Stable cursor behavior
 */

export interface NotionEditorProps {
 /** Initial content as TipTap JSON */
 content?: MarkdownDocument | null;
 /** Callback when content changes */
 onUpdate?: (content: MarkdownDocument) => void;
 /** Callback for autosave (debounced by parent) */
 onSave?: (content: MarkdownDocument) => void;
 /** Read-only mode */
 editable?: boolean;
 /** Placeholder text */
 placeholder?: string;
 /** Additional class names */
 className?: string;
}

export function NotionEditor({
 content,
 onUpdate,
 editable = true,
 placeholder ="Press'/' for commands, or start typing...",
 className ='',
}: NotionEditorProps) {
 // Annotation / Drawing State
 const [activeTool, setActiveTool] = useState<string>('keyboard');
 const [activeColor, setActiveColor] = useState<string>('#ef4444');
 const [annotations, setAnnotations] = useState<Stroke[]>([]);
 const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
 const [isErasing, setIsErasing] = useState(false);
 const [history, setHistory] = useState<Stroke[][]>([]);
 const [future, setFuture] = useState<Stroke[][]>([]);

 const containerRef = useRef<HTMLDivElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

 // Memoize initial content to avoid re-renders
 const initialContent = useMemo(() => {
 if (!content) return EMPTY_DOCUMENT;
 return content;
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 const editor = useEditor({
 extensions: [
 StarterKit.configure({
 // Disable built-in code block to use custom one if needed
 codeBlock: {
 HTMLAttributes: {
 class:'notion-code-block',
 },
 },
 // Configure heading levels
 heading: {
 levels: [1, 2, 3],
 },
 }),
 Placeholder.configure({
 placeholder: ({ node }) => {
 if (node.type.name ==='heading') {
 const level = node.attrs.level;
 return `Heading ${level}`;
 }
 return placeholder;
 },
 emptyEditorClass:'is-editor-empty',
 emptyNodeClass:'is-empty',
 }),
 Typography,
 MathInline,
 MathBlock,
 SlashCommand,
 ],
 content: initialContent,
 editable,
 editorProps: {
 attributes: {
 class:'notion-editor-content',
 },
 },
 onUpdate: ({ editor }) => {
 const json = editor.getJSON() as MarkdownDocument;
 onUpdate?.(json);
 },
 // Prevent cursor jumps on re-render
 immediatelyRender: false,
 });

 // Update editable state when prop changes
 useEffect(() => {
 if (editor && editor.isEditable !== editable) {
 editor.setEditable(editable);
 }
 }, [editor, editable]);

 // Sync content when prop changes (for async data loading)
 // Only update if content is different from current editor content
 useEffect(() => {
 if (!editor || !content) return;

 // Compare content to avoid unnecessary updates that would reset cursor
 const currentContent = JSON.stringify(editor.getJSON());
 const newContent = JSON.stringify(content);

 if (currentContent !== newContent && newContent !== JSON.stringify(EMPTY_DOCUMENT)) {
 // Use setContent to update without triggering onUpdate callback
 editor.commands.setContent(content, { emitUpdate: false });
 }
 }, [editor, content]);

 // Handle keyboard shortcuts
 const handleKeyDown = useCallback(
 (event: React.KeyboardEvent) => {
 // Cmd/Ctrl + B for bold
 if ((event.metaKey || event.ctrlKey) && event.key ==='b') {
 event.preventDefault();
 editor?.chain().focus().toggleBold().run();
 }
 // Cmd/Ctrl + I for italic
 if ((event.metaKey || event.ctrlKey) && event.key ==='i') {
 event.preventDefault();
 editor?.chain().focus().toggleItalic().run();
 }
 // Cmd/Ctrl + E for code
 if ((event.metaKey || event.ctrlKey) && event.key ==='e') {
 event.preventDefault();
 editor?.chain().focus().toggleCode().run();
 }
 
 // Undo/Redo for drawings
 if ((event.ctrlKey || event.metaKey) && event.key ==='z') {
 if (activeTool !=='keyboard') {
 event.preventDefault();
 if (event.shiftKey) handleRedo();
 else handleUndo();
 }
 }
 },
 [editor, activeTool, history, future, annotations] // Needs proper deps if extracted further
 );

 // Resize observer for canvas
 useEffect(() => {
 if (!containerRef.current) return;
 const resizeObserver = new ResizeObserver(entries => {
 for (let entry of entries) {
 const { width, height } = entry.contentRect;
 setCanvasSize({ width, height });
 if (canvasRef.current) {
 canvasRef.current.width = width;
 canvasRef.current.height = height;
 }
 }
 });
 resizeObserver.observe(containerRef.current);
 return () => resizeObserver.disconnect();
 }, []);

 // Drawing loop
 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 ctx.clearRect(0, 0, canvas.width, canvas.height);

 const drawStroke = (points: Point[], color: string, strokeType: string, width_val?: number) => {
 if (points.length < 2) return;
 ctx.beginPath();
 ctx.lineWidth = width_val || (strokeType ==="highlighter" ? 20 : 2);
 ctx.lineJoin ='round';
 ctx.lineCap ='round';
 ctx.strokeStyle = strokeType ==="highlighter" ? hexToRgba(color, 0.3) : color;

 ctx.moveTo(points[0].x * canvasSize.width, points[0].y * canvasSize.height);
 for (let i = 1; i < points.length; i++) {
 ctx.lineTo(points[i].x * canvasSize.width, points[i].y * canvasSize.height);
 }
 ctx.stroke();
 };

 annotations.forEach(stroke => {
 drawStroke(stroke.points, stroke.color, stroke.type, stroke.width);
 });

 if (currentStroke) {
 const isHighlighter = activeTool ==='highlighter';
 drawStroke(currentStroke, activeColor, isHighlighter ?'highlighter' :'pen', isHighlighter ? 20 : 2);
 }
 }, [annotations, currentStroke, canvasSize, activeColor, activeTool]);

 // Undo / Redo Logic
 const addToHistory = useCallback(() => {
 setHistory(prev => [...prev, annotations]);
 setFuture([]);
 }, [annotations]);

 const handleUndo = useCallback(() => {
 if (history.length === 0) return;
 const previousState = history[history.length - 1];
 setFuture(prev => [...prev, annotations]);
 setHistory(prev => prev.slice(0, -1));
 setAnnotations(previousState);
 }, [history, annotations]);

 const handleRedo = useCallback(() => {
 if (future.length === 0) return;
 const nextState = future[future.length - 1];
 setHistory(prev => [...prev, annotations]);
 setFuture(prev => prev.slice(0, -1));
 setAnnotations(nextState);
 }, [future, annotations]);

 // Pointer Handlers
 const getPoint = (e: React.PointerEvent): Point | null => {
 const canvas = canvasRef.current;
 if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return null;
 const rect = canvas.getBoundingClientRect();
 const x = (e.clientX - rect.left) / rect.width;
 const y = (e.clientY - rect.top) / rect.height;
 return {
 x: Math.max(0, Math.min(x, 1)),
 y: Math.max(0, Math.min(y, 1))
 };
 };

 const performErase = useCallback((p: Point) => {
 setAnnotations(prev => {
 const radius = 0.02;
 return prev.filter(stroke => 
 !stroke.points.some(sp => Math.abs(sp.x - p.x) < radius && Math.abs(sp.y - p.y) < radius)
 );
 });
 }, []);

 const handlePointerDown = useCallback((e: React.PointerEvent) => {
 if (activeTool ==='keyboard') return;
 const point = getPoint(e);
 if (!point) return;

 if (activeTool ==='pen' || activeTool ==='highlighter') {
 setCurrentStroke([point]);
 if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
 } else if (activeTool ==='eraser') {
 setIsErasing(true);
 addToHistory();
 performErase(point);
 if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
 }
 }, [activeTool, addToHistory, performErase]);

 const handlePointerMove = useCallback((e: React.PointerEvent) => {
 if (activeTool ==='keyboard') return;
 if (e.buttons !== 1) return;
 const point = getPoint(e);
 if (!point) return;

 if (activeTool ==='pen' || activeTool ==='highlighter') {
 setCurrentStroke(prev => prev ? [...prev, point] : [point]);
 } else if (activeTool ==='eraser' && isErasing) {
 performErase(point);
 }
 }, [activeTool, isErasing, performErase]);

 const handlePointerUp = useCallback((e: React.PointerEvent) => {
 if (activeTool ==='keyboard') return;
 if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
 canvasRef.current.releasePointerCapture(e.pointerId);
 }

 if ((activeTool ==='pen' || activeTool ==='highlighter') && currentStroke && currentStroke.length > 1) {
 addToHistory();
 const strokeColor = activeColor;
 const strokeType = activeTool ==='highlighter' ?"highlighter" :"pen";
 const strokeWidth = activeTool ==='highlighter' ? 20 : 2;
 setAnnotations(prev => [
 ...prev, 
 { points: currentStroke, color: strokeColor, type: strokeType as"pen" |"highlighter", width: strokeWidth }
 ]);
 }
 setCurrentStroke(null);
 setIsErasing(false);
 }, [activeTool, currentStroke, activeColor, addToHistory]);

 if (!editor) {
 return (
 <div className={`notion-editor ${className}`}>
 <div className="notion-editor-loading">
 Loading editor...
 </div>
 </div>
 );
 }

 return (
 <div ref={containerRef} className={`notion-editor relative ${className}`} onKeyDown={handleKeyDown}>
 {editable && (
 <div className="fixed right-8 bottom-8 z-50">
 <UnifiedAnnotationToolbar 
 activeTool={activeTool}
 setActiveTool={setActiveTool}
 activeColor={activeColor}
 setActiveColor={setActiveColor}
 onUndo={handleUndo}
 onRedo={handleRedo}
 />
 </div>
 )}
 <div className={`${activeTool !=='keyboard' ?'opacity-50 pointer-events-none transition-opacity' :'transition-opacity'}`}>
 <EditorContent editor={editor} />
 </div>
 {/* Canvas Overlay */}
 <canvas
 ref={canvasRef}
 className={`absolute inset-0 z-10 ${activeTool !=='keyboard' ?'pointer-events-auto cursor-crosshair' :'pointer-events-none'}`}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerUp}
 style={{ touchAction: activeTool !=='keyboard' ?'none' :'auto' }}
 />
 </div>
 );
}

/**
 * Get plain text from editor content for thumbnails
 */
export function getPlainTextFromContent(content: MarkdownDocument): string {
 const extractText = (node: any): string => {
 if (node.type ==='text') {
 return node.text ||'';
 }
 if (node.type ==='mathInline' || node.type ==='mathBlock') {
 return node.attrs?.latex ||'';
 }
 if (node.content) {
 return node.content.map(extractText).join('');
 }
 return'';
 };

 if (!content?.content) return'';

 return content.content
 .slice(0, 5) // First 5 blocks
 .map(extractText)
 .join('\n')
 .trim();
}

export default NotionEditor;
