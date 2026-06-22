import React, { useEffect, useRef, useState } from'react';
import * as pdfjsLib from'pdfjs-dist';
import { TextLayer } from'pdfjs-dist';
import { useInView } from'react-intersection-observer';
import { Point, Stroke, TextNote, ShapeType } from'@/components/annotations/types';

interface VirtualPageProps {
 pdfDoc: pdfjsLib.PDFDocumentProxy;
 pageNum: number;
 scale: number;
 zoomMode:"fit-width" |"fit-height" |"custom";
 containerWidth: number;
 annotations: Stroke[];
 textNotes: TextNote[];
 currentStroke: Point[] | null;
 tool: string;
 penColor: string;
 highlightColor: string;
 penWidth: number;
 highlightWidth: number;
 shape: ShapeType;
 onPointerDown: (e: React.PointerEvent, pageNum: number, point: Point) => void;
 onPointerMove: (e: React.PointerEvent, pageNum: number, point: Point) => void;
 onPointerUp: (e: React.PointerEvent, pageNum: number) => void;
 onTextNoteClick: (e: React.PointerEvent, pageNum: number, point: Point) => void;
 searchQuery?: string;
}

export const VirtualPage: React.FC<VirtualPageProps> = React.memo(({
 pdfDoc, pageNum, scale, zoomMode: _zoomMode, containerWidth, annotations, textNotes: _textNotes,
 currentStroke, tool, penColor, highlightColor, penWidth, highlightWidth, shape,
 onPointerDown, onPointerMove, onPointerUp, onTextNoteClick, searchQuery: _searchQuery
}) => {
 const { ref: inViewRef, inView } = useInView({
 threshold: 0,
 rootMargin:'200% 0px 200% 0px', // Render when within 2 viewport heights
 });

 const canvasRef = useRef<HTMLCanvasElement>(null);
 const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
 const textLayerRef = useRef<HTMLDivElement>(null);
 const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
 const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null);
 
 // 1. Calculate and set dimensions immediately before rendering to reserve space
 useEffect(() => {
 let isMounted = true;
 const calcDim = async () => {
 try {
 const page = await pdfDoc.getPage(pageNum);
 const viewport = page.getViewport({ scale });
 if (isMounted) setDimensions({ width: viewport.width, height: viewport.height });
 } catch (e) { console.error(e); }
 };
 calcDim();
 return () => { isMounted = false; };
 }, [pdfDoc, pageNum, scale]);

 // 2. Render PDF Canvas and Text Layer when in view
 useEffect(() => {
 if (!inView || !dimensions || !canvasRef.current || scale === 0) return;
 
 let isCancelled = false;

 const render = async () => {
 if (renderTaskRef.current) renderTaskRef.current.cancel();

 try {
 const page = await pdfDoc.getPage(pageNum);
 const viewport = page.getViewport({ scale });
 
 const canvas = canvasRef.current;
 const context = canvas?.getContext('2d');
 if (!canvas || !context) return;

 canvas.width = viewport.width;
 canvas.height = viewport.height;

 const renderContext = {
 canvasContext: context,
 viewport: viewport,
 canvas: canvas,
 };

 const renderTask = page.render(renderContext);
 renderTaskRef.current = renderTask;
 await renderTask.promise;

 if (isCancelled) return;

 // Render Text Layer
 if (textLayerRef.current) {
 const textLayerDiv = textLayerRef.current;
 textLayerDiv.innerHTML =''; // Clear previous
 textLayerDiv.style.width = `${viewport.width}px`;
 textLayerDiv.style.height = `${viewport.height}px`;

 const textContent = await page.getTextContent();

 const textLayerInstance = new TextLayer({
 textContentSource: textContent,
 container: textLayerDiv,
 viewport: viewport,
 });
 await textLayerInstance.render();
 }

 } catch (err: any) {
 if (err.name !=="RenderingCancelledException") {
 console.error("Render error page", pageNum, err);
 }
 }
 };

 render();

 return () => {
 isCancelled = true;
 if (renderTaskRef.current) renderTaskRef.current.cancel();
 };
 }, [inView, pdfDoc, pageNum, scale, dimensions]);

 // 3. Render Annotations when in view
 useEffect(() => {
 if (!inView || !dimensions || !annotationCanvasRef.current) return;
 
 const canvas = annotationCanvasRef.current;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 canvas.width = dimensions.width;
 canvas.height = dimensions.height;

 ctx.clearRect(0, 0, canvas.width, canvas.height);

 const drawStroke = (stroke: Stroke | { points: Point[], color: string, type: string, width: number, shape: ShapeType }) => {
 if (stroke.points.length < 2) return;
 ctx.beginPath();
 ctx.lineWidth = stroke.width || 2;
 ctx.lineJoin ='round';
 ctx.lineCap ='round';
 ctx.strokeStyle = stroke.color;
 ctx.globalAlpha = stroke.type ==='highlighter' ? 0.3 : 1;

 const shapeType = stroke.shape ||"freehand";

 if (shapeType ==="freehand") {
 // Handle pressure by drawing multiple short segments
 for (let i = 0; i < stroke.points.length - 1; i++) {
 const p1 = stroke.points[i];
 const p2 = stroke.points[i + 1];
 const p1Pressure = p1.pressure ?? 1;
 const p2Pressure = p2.pressure ?? 1;
 const avgPressure = (p1Pressure + p2Pressure) / 2;
 
 ctx.beginPath();
 // Vary thickness by 50% based on pressure. (0.5 to 1.0 multiplier)
 ctx.lineWidth = (stroke.width || 2) * (0.5 + avgPressure * 0.5);
 ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
 ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
 ctx.stroke();
 }
 } else if (shapeType ==="line") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
 ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
 ctx.stroke();
 } else if (shapeType ==="rect") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const x = Math.min(p1.x, p2.x) * canvas.width;
 const y = Math.min(p1.y, p2.y) * canvas.height;
 const w = Math.abs(p2.x - p1.x) * canvas.width;
 const h = Math.abs(p2.y - p1.y) * canvas.height;
 ctx.strokeRect(x, y, w, h);
 } else if (shapeType ==="circle") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const dx = (p2.x - p1.x) * canvas.width;
 const dy = (p2.y - p1.y) * canvas.height;
 const r = Math.sqrt(dx * dx + dy * dy);
 ctx.arc(p1.x * canvas.width, p1.y * canvas.height, r, 0, 2 * Math.PI);
 ctx.stroke();
 } else if (shapeType ==="arrow") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const x1 = p1.x * canvas.width;
 const y1 = p1.y * canvas.height;
 const x2 = p2.x * canvas.width;
 const y2 = p2.y * canvas.height;
 
 ctx.moveTo(x1, y1);
 ctx.lineTo(x2, y2);
 ctx.stroke();
 
 const angle = Math.atan2(y2 - y1, x2 - x1);
 const headLen = (stroke.width || 2) * 3 + 5;
 const angleOffset = Math.PI / 6;
 
 ctx.beginPath();
 ctx.moveTo(x2, y2);
 ctx.lineTo(x2 - headLen * Math.cos(angle - angleOffset), y2 - headLen * Math.sin(angle - angleOffset));
 ctx.stroke();
 
 ctx.beginPath();
 ctx.moveTo(x2, y2);
 ctx.lineTo(x2 - headLen * Math.cos(angle + angleOffset), y2 - headLen * Math.sin(angle + angleOffset));
 ctx.stroke();
 }
 };

 annotations.forEach(drawStroke);

 if (currentStroke) {
 const strokeColor = tool ==='highlighter' ? highlightColor : penColor;
 const strokeType = tool ==='highlighter' ?'highlighter' :'pen';
 const strokeWidth = tool ==='highlighter' ? highlightWidth : penWidth;
 drawStroke({ points: currentStroke, color: strokeColor, type: strokeType, width: strokeWidth, shape });
 }

 }, [inView, dimensions, annotations, currentStroke, tool, penColor, highlightColor, penWidth, highlightWidth, shape]);

 const getPoint = (e: React.PointerEvent): Point | null => {
 if (!annotationCanvasRef.current || !dimensions) return null;
 const rect = annotationCanvasRef.current.getBoundingClientRect();
 const x = (e.clientX - rect.left) / rect.width;
 const y = (e.clientY - rect.top) / rect.height;
 // e.pressure is 0 if unsupported/mouse, 0.5 default, or 0-1 for stylus
 return {
 x: Math.max(0, Math.min(x, 1)),
 y: Math.max(0, Math.min(y, 1)),
 pressure: e.pressure || 0.5 
 };
 };

 const handlePointerDown = (e: React.PointerEvent) => {
 if (tool ==='text') {
 onTextNoteClick(e, pageNum, getPoint(e)!);
 return;
 }
 onPointerDown(e, pageNum, getPoint(e)!);
 };

 const handlePointerMove = (e: React.PointerEvent) => {
 if (e.buttons !== 1) return;
 const point = getPoint(e);
 if (point) onPointerMove(e, pageNum, point);
 };

 const handlePointerUp = (e: React.PointerEvent) => {
 onPointerUp(e, pageNum);
 };

 // Calculate placeholder height before PDF renders to prevent scroll jump
 const placeholderHeight = dimensions ? dimensions.height : (containerWidth * 1.414); // A4 ratio fallback

 return (
 <div 
 ref={inViewRef}
 className="relative bg-white shadow-xl mb-8 mx-auto"
 style={{ 
 width: dimensions ? dimensions.width : containerWidth, 
 height: placeholderHeight,
 minHeight: placeholderHeight
 }}
 data-page-number={pageNum}
 >
 {inView ? (
 <>
 <canvas ref={canvasRef} className="absolute inset-0 z-0" />
 <div 
 ref={textLayerRef} 
 className="textLayer absolute inset-0 z-10 opacity-50 selection:bg-blue-300"
 style={{'--scale-factor': scale } as React.CSSProperties}
 />
 <canvas 
 ref={annotationCanvasRef} 
 className="absolute inset-0 z-20 touch-none cursor-crosshair"
 style={{ pointerEvents: tool ==='none' ?'none' :'auto' }}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 />
 {/* Render Text Notes Overlay Here via Portal or Absolute positioning in parent, or passed children */}
 </>
 ) : (
 <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
 Loading page {pageNum}...
 </div>
 )}
 </div>
 );
});

VirtualPage.displayName ='VirtualPage';
