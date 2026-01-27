/**
 * TypeScript interfaces for TipTap block-based document structure.
 * These match the TipTap/ProseMirror document model.
 */

// ============================================
// Document Structure
// ============================================

export interface MarkdownDocument {
    type: 'doc';
    content: Block[];
}

// ============================================
// Block Types
// ============================================

export type BlockType =
    | 'paragraph'
    | 'heading'
    | 'bulletList'
    | 'orderedList'
    | 'listItem'
    | 'blockquote'
    | 'codeBlock'
    | 'horizontalRule'
    | 'mathBlock';

export interface BaseBlock {
    type: BlockType;
    attrs?: Record<string, unknown>;
    content?: (InlineContent | Block)[];
}

export interface ParagraphBlock extends BaseBlock {
    type: 'paragraph';
    content?: InlineContent[];
}

export interface HeadingBlock extends BaseBlock {
    type: 'heading';
    attrs: {
        level: 1 | 2 | 3;
    };
    content?: InlineContent[];
}

export interface BulletListBlock extends BaseBlock {
    type: 'bulletList';
    content: ListItemBlock[];
}

export interface OrderedListBlock extends BaseBlock {
    type: 'orderedList';
    attrs?: {
        start?: number;
    };
    content: ListItemBlock[];
}

export interface ListItemBlock extends BaseBlock {
    type: 'listItem';
    content: Block[];
}

export interface BlockquoteBlock extends BaseBlock {
    type: 'blockquote';
    content: Block[];
}

export interface CodeBlockBlock extends BaseBlock {
    type: 'codeBlock';
    attrs?: {
        language?: string;
    };
    content?: TextNode[];
}

export interface HorizontalRuleBlock extends BaseBlock {
    type: 'horizontalRule';
}

export interface MathBlockBlock extends BaseBlock {
    type: 'mathBlock';
    attrs: {
        latex: string;
    };
}

export type Block =
    | ParagraphBlock
    | HeadingBlock
    | BulletListBlock
    | OrderedListBlock
    | ListItemBlock
    | BlockquoteBlock
    | CodeBlockBlock
    | HorizontalRuleBlock
    | MathBlockBlock;

// ============================================
// Inline Content
// ============================================

export type InlineType = 'text' | 'mathInline' | 'hardBreak';

export interface TextNode {
    type: 'text';
    text: string;
    marks?: Mark[];
}

export interface MathInlineNode {
    type: 'mathInline';
    attrs: {
        latex: string;
    };
}

export interface HardBreakNode {
    type: 'hardBreak';
}

export type InlineContent = TextNode | MathInlineNode | HardBreakNode;

// ============================================
// Marks (Inline Formatting)
// ============================================

export type MarkType = 'bold' | 'italic' | 'code' | 'link' | 'strike';

export interface BaseMark {
    type: MarkType;
    attrs?: Record<string, unknown>;
}

export interface BoldMark extends BaseMark {
    type: 'bold';
}

export interface ItalicMark extends BaseMark {
    type: 'italic';
}

export interface CodeMark extends BaseMark {
    type: 'code';
}

export interface LinkMark extends BaseMark {
    type: 'link';
    attrs: {
        href: string;
        target?: string;
        rel?: string;
    };
}

export interface StrikeMark extends BaseMark {
    type: 'strike';
}

export type Mark = BoldMark | ItalicMark | CodeMark | LinkMark | StrikeMark;

// ============================================
// Helper Types
// ============================================

/**
 * Empty document for initializing new notes
 */
export const EMPTY_DOCUMENT: MarkdownDocument = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [],
        },
    ],
};

/**
 * Validate if a JSON object is a valid MarkdownDocument
 */
export function isValidDocument(doc: unknown): doc is MarkdownDocument {
    if (!doc || typeof doc !== 'object') return false;
    const d = doc as Record<string, unknown>;
    return d.type === 'doc' && Array.isArray(d.content);
}
