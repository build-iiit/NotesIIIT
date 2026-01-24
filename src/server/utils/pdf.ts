import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

interface CanvasContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any;
}

// Helper for canvas factory needed by pdfjs-dist in Node
interface CanvasAndContext {
    canvas: ReturnType<typeof createCanvas>;
    context: ReturnType<ReturnType<typeof createCanvas>['getContext']>;
}

class NodeCanvasFactory {
    create(width: number, height: number): CanvasAndContext {
        const canvas = createCanvas(width, height);
        return {
            canvas,
            context: canvas.getContext('2d'),
        };
    }

    reset(canvasAndContext: CanvasContext, width: number, height: number) {
    reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: CanvasContext) {
    destroy(canvasAndContext: CanvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
    }
}

/**
 * Extract page count from PDF buffer
 */
export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}

/**
 * Generate a JPEG thumbnail of the first page
 */
export async function generateThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({
        data,
        canvasFactory: new NodeCanvasFactory()
        canvasFactory: new NodeCanvasFactory() as unknown as pdfjsLib.CanvasFactory
    });

    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);

    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvasContext: context as any, // Cast to any to satisfy RenderParameters which expects CanvasRenderingContext2D (NodeCanvas vs DOM Canvas mismatch)
        viewport,
    };

    await page.render(renderContext).promise;
    await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement
    }).promise;

    return canvas.toBuffer('image/jpeg');
}

/**
 * Create a single-page PDF up from an image buffer
 */
export async function imageToPdf(imageBuffer: Buffer, mimeType: 'image/png' | 'image/jpeg'): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    let image;
    if (mimeType === 'image/png') {
        image = await pdfDoc.embedPng(imageBuffer);
    } else {
        image = await pdfDoc.embedJpg(imageBuffer);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

/**
 * Replace a specific page in a PDF with content from another PDF (single page)
 */
export async function replacePage(
    originalPdfBuffer: Buffer,
    replacementPdfBuffer: Buffer,
    pageIndex: number // 0-indexed
): Promise<Buffer> {
    const originalDoc = await PDFDocument.load(originalPdfBuffer);
    const replacementDoc = await PDFDocument.load(replacementPdfBuffer);

    // Create a new document to hold the result (safest way to avoid corruption)
    // Actually pdf-lib allows in-place modification which is faster

    // 1. Remove the old page
    // Note: removing page shifts indices.
    originalDoc.removePage(pageIndex);

    // 2. Copy the replacement page
    const [newPage] = await originalDoc.copyPages(replacementDoc, [0]);

    // 3. Insert at the same index
    originalDoc.insertPage(pageIndex, newPage);

    const savedBytes = await originalDoc.save();
    return Buffer.from(savedBytes);
}
