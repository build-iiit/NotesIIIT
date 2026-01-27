"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useCallback, useEffect, useMemo } from 'react';

import { MathInline } from './extensions/MathInline';
import { MathBlock } from './extensions/MathBlock';
import { SlashCommand } from './extensions/SlashCommand';
import './EditorStyles.css';
import 'katex/dist/katex.min.css';

import type { MarkdownDocument } from '@/types/markdownSchema';
import { EMPTY_DOCUMENT } from '@/types/markdownSchema';

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
    placeholder = "Press '/' for commands, or start typing...",
    className = '',
}: NotionEditorProps) {
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
                        class: 'notion-code-block',
                    },
                },
                // Configure heading levels
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') {
                        const level = node.attrs.level;
                        return `Heading ${level}`;
                    }
                    return placeholder;
                },
                emptyEditorClass: 'is-editor-empty',
                emptyNodeClass: 'is-empty',
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
                class: 'notion-editor-content',
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
            if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
                event.preventDefault();
                editor?.chain().focus().toggleBold().run();
            }
            // Cmd/Ctrl + I for italic
            if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
                event.preventDefault();
                editor?.chain().focus().toggleItalic().run();
            }
            // Cmd/Ctrl + E for code
            if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
                event.preventDefault();
                editor?.chain().focus().toggleCode().run();
            }
        },
        [editor]
    );

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
        <div className={`notion-editor ${className}`} onKeyDown={handleKeyDown}>
            <EditorContent editor={editor} />
        </div>
    );
}

/**
 * Get plain text from editor content for thumbnails
 */
export function getPlainTextFromContent(content: MarkdownDocument): string {
    const extractText = (node: any): string => {
        if (node.type === 'text') {
            return node.text || '';
        }
        if (node.type === 'mathInline' || node.type === 'mathBlock') {
            return node.attrs?.latex || '';
        }
        if (node.content) {
            return node.content.map(extractText).join('');
        }
        return '';
    };

    if (!content?.content) return '';

    return content.content
        .slice(0, 5) // First 5 blocks
        .map(extractText)
        .join('\n')
        .trim();
}

export default NotionEditor;
