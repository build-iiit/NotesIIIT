import { PDFDocument, rgb, degrees } from'pdf-lib';
import { Stroke, TextNote, PageAnnotations } from'@/components/annotations/types';

/**
 * Helper to convert hex color (e.g. #FF0000) to RGB components for pdf-lib (0-1 range)
 */
const hexToRgb = (hex: string) => {
 // Remove # if present
 hex = hex.replace(/^#/,'');
 
 // Parse hex values
 let r = 0, g = 0, b = 0;
 if (hex.length === 3) {
 r = parseInt(hex[0] + hex[0], 16);
 g = parseInt(hex[1] + hex[1], 16);
 b = parseInt(hex[2] + hex[2], 16);
 } else if (hex.length === 6) {
 r = parseInt(hex.slice(0, 2), 16);
 g = parseInt(hex.slice(2, 4), 16);
 b = parseInt(hex.slice(4, 6), 16);
 }

 // Convert to 0-1 range
 return {
 r: r / 255,
 g: g / 255,
 b: b / 255,
 };
};

/**
 * Parse rgba strings (e.g., rgba(255, 255, 0, 0.3)) into r,g,b,a 0-1 values.
 * Fallback to hex parser if not rgba.
 */
const parseColor = (colorStr: string) => {
 if (colorStr.startsWith('rgba(')) {
 const parts = colorStr.replace('rgba(','').replace(')','').split(',');
 if (parts.length >= 3) {
 return {
 r: parseInt(parts[0].trim()) / 255,
 g: parseInt(parts[1].trim()) / 255,
 b: parseInt(parts[2].trim()) / 255,
 a: parts.length > 3 ? parseFloat(parts[3].trim()) : 1,
 };
 }
 }
 const c = hexToRgb(colorStr);
 return { ...c, a: 1 };
};

/**
 * Burns annotations (strokes and text) into a PDF document and returns the new PDF bytes.
 */
export async function exportAnnotatedPdf(
 pdfBytes: ArrayBuffer,
 annotations: Record<number, Stroke[]>,
 textNotes: Record<number, TextNote[]>
): Promise<Uint8Array> {
 const pdfDoc = await PDFDocument.load(pdfBytes);
 const pages = pdfDoc.getPages();

 // Iterate through all pages in the PDF (1-indexed for annotations)
 for (let i = 0; i < pages.length; i++) {
 const pageNum = i + 1;
 const page = pages[i];
 
 // pdf-lib's coordinate system is (0,0) at bottom-left.
 // Our canvas is (0,0) at top-left.
 const { width, height } = page.getSize();

 // 1. Draw Strokes
 const pageStrokes = annotations[pageNum] || [];
 for (const stroke of pageStrokes) {
 if (!stroke.points || stroke.points.length < 2) continue;

 const colorData = parseColor(stroke.color);
 const color = rgb(colorData.r, colorData.g, colorData.b);
 const opacity = stroke.type ==='highlighter' ? 0.4 : colorData.a;
 const baseThickness = stroke.width || (stroke.type ==="highlighter" ? 15 : 2);

 const shape = stroke.shape ||"freehand";

 if (shape ==="freehand") {
 // For freehand, we draw segments between points.
 // If pressure is provided, we adjust thickness per segment.
 for (let j = 0; j < stroke.points.length - 1; j++) {
 const p1 = stroke.points[j];
 const p2 = stroke.points[j + 1];

 // Convert normalized (0-1) coordinates to PDF coordinates
 const x1 = p1.x * width;
 const y1 = height - (p1.y * height);
 const x2 = p2.x * width;
 const y2 = height - (p2.y * height);

 // Average pressure for this segment, or default to 1
 const pressure1 = p1.pressure ?? 1;
 const pressure2 = p2.pressure ?? 1;
 const avgPressure = (pressure1 + pressure2) / 2;
 const thickness = baseThickness * (0.5 + avgPressure * 0.5); // vary thickness by 50% based on pressure

 page.drawLine({
 start: { x: x1, y: y1 },
 end: { x: x2, y: y2 },
 thickness: thickness,
 color: color,
 opacity: opacity,
 });
 }
 } else if (shape ==="line") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 page.drawLine({
 start: { x: p1.x * width, y: height - (p1.y * height) },
 end: { x: p2.x * width, y: height - (p2.y * height) },
 thickness: baseThickness,
 color: color,
 opacity: opacity,
 });
 } else if (shape ==="arrow") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const x1 = p1.x * width;
 const y1 = height - (p1.y * height);
 const x2 = p2.x * width;
 const y2 = height - (p2.y * height);

 // Draw main line
 page.drawLine({
 start: { x: x1, y: y1 },
 end: { x: x2, y: y2 },
 thickness: baseThickness,
 color: color,
 opacity: opacity,
 });

 // Calculate arrow head
 const angle = Math.atan2(y2 - y1, x2 - x1);
 const headLen = baseThickness * 3 + 5;
 const angleOffset = Math.PI / 6; // 30 degrees

 const h1x = x2 - headLen * Math.cos(angle - angleOffset);
 const h1y = y2 - headLen * Math.sin(angle - angleOffset);
 const h2x = x2 - headLen * Math.cos(angle + angleOffset);
 const h2y = y2 - headLen * Math.sin(angle + angleOffset);

 page.drawLine({
 start: { x: x2, y: y2 },
 end: { x: h1x, y: h1y },
 thickness: baseThickness,
 color: color,
 opacity: opacity,
 });
 page.drawLine({
 start: { x: x2, y: y2 },
 end: { x: h2x, y: h2y },
 thickness: baseThickness,
 color: color,
 opacity: opacity,
 });
 } else if (shape ==="rect") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const x = Math.min(p1.x, p2.x) * width;
 const y = height - (Math.max(p1.y, p2.y) * height);
 const w = Math.abs(p2.x - p1.x) * width;
 const h = Math.abs(p2.y - p1.y) * height;

 page.drawRectangle({
 x: x,
 y: y,
 width: w,
 height: h,
 borderColor: color,
 borderWidth: baseThickness,
 opacity: opacity,
 borderOpacity: opacity,
 });
 } else if (shape ==="circle") {
 const p1 = stroke.points[0];
 const p2 = stroke.points[stroke.points.length - 1];
 const dx = (p2.x - p1.x) * width;
 const dy = (p2.y - p1.y) * height;
 const r = Math.sqrt(dx * dx + dy * dy);

 page.drawEllipse({
 x: p1.x * width,
 y: height - (p1.y * height),
 xScale: r,
 yScale: r,
 borderColor: color,
 borderWidth: baseThickness,
 opacity: opacity,
 borderOpacity: opacity,
 });
 }
 }

 // 2. Draw Text Notes
 const pageNotes = textNotes[pageNum] || [];
 for (const note of pageNotes) {
 if (!note.content) continue;
 
 const colorData = parseColor(note.color);
 
 // Adjust y to account for the font size since pdf-lib draws text from the bottom-left of the line
 // and our web canvas positions from top-left.
 const fontSize = note.fontSize || 14;
 const pdfX = note.x * width;
 const pdfY = height - (note.y * height) - fontSize; // Shift down by font size

 page.drawText(note.content, {
 x: pdfX,
 y: pdfY,
 size: fontSize,
 color: rgb(colorData.r, colorData.g, colorData.b),
 maxWidth: note.width * width, // wrap text if it hits the user's defined width
 lineHeight: fontSize * 1.2,
 });
 }
 }

 return await pdfDoc.save();
}
