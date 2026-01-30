import { createCanvas } from 'canvas';
import { s3Client } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 630;
const ACCENT_COLOR = '#3b82f6'; // blue-500

interface TipTapNode {
    type: string;
    text?: string;
    attrs?: Record<string, string>;
    content?: TipTapNode[];
}

/**
 * Extract plain text from TipTap JSON for preview
 */
function extractTextFromContent(node: TipTapNode): string {
    if (node.type === 'text') {
        return node.text || '';
    }
    if (node.type === 'hardBreak') {
        return '\n';
    }
    if (node.type === 'mathInline') {
        return ` $${node.attrs?.latex || ''}$ `;
    }
    if (node.type === 'mathBlock') {
        // Use a special marker or just newlines to isolate it
        return `\n$$${node.attrs?.latex || ''}$$\n`;
    }
    if (node.content) {
        // Doc and Lists contain blocks -> join with newline
        // Paragraphs contain inline -> join with empty string
        const isBlockContainer = ['doc', 'blockquote', 'bulletList', 'orderedList', 'listItem'].includes(node.type);
        const separator = isBlockContainer ? '\n' : '';
        return node.content.map(extractTextFromContent).join(separator);
    }
    return '';
}

/**
 * Generate a thumbnail image buffer from note content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateThumbnail(title: string, content: any): Promise<Buffer> {
    const rootNode = content as TipTapNode;
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient (Soft Blue)
    const gradient = ctx.createLinearGradient(0, 0, 0, THUMBNAIL_HEIGHT);
    gradient.addColorStop(0, '#f8fafc'); // slate-50
    gradient.addColorStop(1, '#e2e8f0'); // slate-200
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // 2. Decorative Patterns (Subtle circles)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)'; // blue-500 very low opacity
    ctx.beginPath();
    ctx.arc(THUMBNAIL_WIDTH - 100, -50, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, THUMBNAIL_HEIGHT + 50, 200, 0, Math.PI * 2);
    ctx.fill();

    // 3. Accent Bar (Top)
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 12);

    // Padding & Typography Config
    const PADDING_X = 80;
    const PADDING_Y = 100;
    let currentY = PADDING_Y;

    // 4. Render Title
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = 'bold 72px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const maxTitleWidth = THUMBNAIL_WIDTH - (PADDING_X * 2);
    const words = title.split(' ');
    let line = '';

    // Title Wrapping
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTitleWidth && i > 0) {
            ctx.fillText(line.trim(), PADDING_X, currentY);
            line = words[i] + ' ';
            currentY += 86; // Line height
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), PADDING_X, currentY);

    // Reset Shadow for Body Text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    currentY += 60; // Spacing after title

    // 5. Render Content Preview
    const plainText = extractTextFromContent(rootNode);
    const contentLines = plainText.split('\n'); // Don't filter, preserve empty lines for spacing if we want

    // Config for text rendering
    const maxPreviewLines = 8;
    const lineHeight = 46;

    let renderedLines = 0;

    for (let i = 0; i < contentLines.length; i++) {
        if (renderedLines >= maxPreviewLines) break;

        let contentLine = contentLines[i].trim();
        if (!contentLine && i > 0 && contentLines[i - 1].trim()) {
            // Allow one empty line as spacer
            currentY += 20;
            continue;
        }
        if (!contentLine) continue;

        // Check for Math Block style ($$...$$)
        const isMathBlock = contentLine.startsWith('$$') && contentLine.endsWith('$$');

        if (isMathBlock) {
            ctx.font = '28px "Courier New", monospace';
            ctx.fillStyle = '#0f172a'; // darker slate

            // Render a background pill for math
            const metrics = ctx.measureText(contentLine);
            const bgWidth = Math.min(metrics.width + 20, maxTitleWidth);

            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // blue-100/50
            ctx.fillRect(PADDING_X - 10, currentY - 26, bgWidth, 36);

            ctx.fillStyle = '#1e293b'; // slate-800
        } else {
            ctx.font = 'normal 36px sans-serif';
            ctx.fillStyle = '#475569'; // slate-600
        }

        // Truncate line if too long
        if (ctx.measureText(contentLine).width > maxTitleWidth) {
            while (ctx.measureText(contentLine + '...').width > maxTitleWidth && contentLine.length > 0) {
                contentLine = contentLine.slice(0, -1);
            }
            contentLine += '...';
        }

        ctx.fillText(contentLine, PADDING_X, currentY);
        currentY += lineHeight;
        renderedLines++;
    }

    // 6. Footer / Branding
    const footerY = THUMBNAIL_HEIGHT - 60;

    // Logo Icon Placeholder (Blue Circle)
    ctx.beginPath();
    ctx.arc(PADDING_X + 15, footerY - 8, 15, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fill();

    // Brand Name
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#334155'; // slate-700
    ctx.fillText('NotesIIIT', PADDING_X + 45, footerY);

    // "Markdown Note" Badge
    const badgeText = 'MARKDOWN';
    ctx.font = 'bold 20px sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 30;

    // Badge Background
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.beginPath();
    ctx.roundRect(THUMBNAIL_WIDTH - PADDING_X - badgeWidth, footerY - 30, badgeWidth, 40, 8);
    ctx.fill();

    // Badge Text
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText(badgeText, THUMBNAIL_WIDTH - PADDING_X - badgeWidth + 15, footerY - 4);

    return canvas.toBuffer('image/png');
}

/**
 * Upload thumbnail to S3 and return the key
 */
export async function uploadThumbnail(noteId: string, itemBuffer: Buffer): Promise<string> {
    const key = `thumbnails/${noteId}.png`;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || "notes-bucket",
        Key: key,
        Body: itemBuffer,
        ContentType: 'image/png',
    });

    try {
        await s3Client.send(command);
        console.log(`Successfully uploaded thumbnail for note ${noteId}`);
        return key;
    } catch (error) {
        console.error("Error uploading thumbnail:", error);
        throw error;
    }
}
