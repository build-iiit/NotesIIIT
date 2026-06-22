"use client";

import { useEditor, EditorContent } from'@tiptap/react';
import StarterKit from'@tiptap/starter-kit';
import Placeholder from'@tiptap/extension-placeholder';
import Typography from'@tiptap/extension-typography';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Code, Download, Undo2, Redo2 } from'lucide-react';
import { useCallback, useEffect, useMemo } from'react';

import { MathInline } from'./extensions/MathInline';
import { MathBlock } from'./extensions/MathBlock';
import { SlashCommand } from'./extensions/SlashCommand';
import'./EditorStyles.css';
import'katex/dist/katex.min.css';

import type { MarkdownDocument } from'@/types/markdownSchema';
import { EMPTY_DOCUMENT } from'@/types/markdownSchema';

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

/** Compact Samsung Notes-style sidebar button */
function SidebarBtn({ active, onClick, title, disabled, children }: {
 active: boolean;
 onClick: () => void;
 title: string;
 disabled?: boolean;
 children: React.ReactNode;
}) {
 return (
 <button
 onClick={onClick}
 title={title}
 disabled={disabled}
 className={`
 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150
 ${active
 ?'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]'
 : disabled
 ?'text-zinc-600 opacity-50'
 :'text-zinc-400 hover:text-white hover:bg-white/10'
 }
 `}
 >
 {children}
 </button>
 );
}
export function NotionEditor({
 content,
 onUpdate,
 editable = true,
 placeholder ="Press'/' for commands, or start typing...",
 className ='',
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
 <div className={`notion-editor flex relative ${className}`} onKeyDown={handleKeyDown}>
 {/* Samsung Notes Style Tool Rail */}
 <div className="w-11 flex-shrink-0 print:hidden sticky top-24 h-max self-start ml-1 my-4">
 <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl py-2 px-1.5 flex flex-col items-center gap-0.5 shadow-lg border border-zinc-800 dark:border-zinc-800/50">
 {editable && (
 <>
 {/* Text Formatting */}
 <SidebarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
 <Bold className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
 <Italic className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
 <Strikethrough className="w-[18px] h-[18px]" />
 </SidebarBtn>

 <div className="w-5 h-px bg-zinc-700 my-1" />

 {/* Headings */}
 <SidebarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
 <Heading1 className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
 <Heading2 className="w-[18px] h-[18px]" />
 </SidebarBtn>

 <div className="w-5 h-px bg-zinc-700 my-1" />

 {/* Lists */}
 <SidebarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
 <List className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
 <ListOrdered className="w-[18px] h-[18px]" />
 </SidebarBtn>

 <div className="w-5 h-px bg-zinc-700 my-1" />

 {/* Blocks */}
 <SidebarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
 <Quote className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
 <Code className="w-[18px] h-[18px]" />
 </SidebarBtn>

 <div className="w-5 h-px bg-zinc-700 my-1" />

 {/* Undo / Redo */}
 <SidebarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo (⌘Z)" disabled={!editor.can().undo()}>
 <Undo2 className="w-[18px] h-[18px]" />
 </SidebarBtn>
 <SidebarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo (⌘⇧Z)" disabled={!editor.can().redo()}>
 <Redo2 className="w-[18px] h-[18px]" />
 </SidebarBtn>

 <div className="w-5 h-px bg-zinc-700 my-1" />
 </>
 )}

 {/* Export */}
 <SidebarBtn active={false} onClick={() => window.print()} title="Export to PDF">
 <Download className="w-[18px] h-[18px]" />
 </SidebarBtn>
 </div>
 </div>

 {/* Editor Content Area */}
 <div className="flex-1 w-full max-w-full print:w-full print:max-w-none print:m-0 print:p-0">
 <EditorContent editor={editor} />
 </div>
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
