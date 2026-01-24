import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, X, StickyNote } from "lucide-react";
import { TextNote } from "./types";

interface TextNoteOverlayProps {
    note: TextNote;
    viewportDimensions: { width: number; height: number };
    isEditing: boolean;
    onSave: (id: string, content: string) => void;
    onUpdate: (id: string, updates: Partial<TextNote>) => void;
    onCancel: (id: string) => void;
    onClick: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleCollapse: (id: string) => void;
    readOnly?: boolean;
}

export const TextNoteOverlay = ({
    note,
    viewportDimensions,
    isEditing,
    onSave,
    onUpdate,
    onCancel,
    onClick,
    onDelete,
    onToggleCollapse,
    readOnly = false
}: TextNoteOverlayProps) => {
    const [editContent, setEditContent] = useState(note.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const noteStartPos = useRef({ x: note.x, y: note.y });
    const noteStartWidth = useRef(note.width || 0.2);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Auto-resize on open
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [isEditing]);

    const handleSave = () => {
        onSave(note.id, editContent);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel(note.id);
        }
    };

    // Move logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly || isEditing) return;
        e.stopPropagation();
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        noteStartPos.current = { x: note.x, y: note.y };
    };

    // Resize logic
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        if (readOnly || isEditing) return;
        e.stopPropagation();
        setIsResizing(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        noteStartWidth.current = note.width || 0.2;
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = (e.clientX - dragStartPos.current.x) / viewportDimensions.width;
                const dy = (e.clientY - dragStartPos.current.y) / viewportDimensions.height;
                const newX = Math.max(0, Math.min(1, noteStartPos.current.x + dx));
                const newY = Math.max(0, Math.min(1, noteStartPos.current.y + dy));
                onUpdate(note.id, { x: newX, y: newY });
            } else if (isResizing) {
                const dx = (e.clientX - dragStartPos.current.x) / viewportDimensions.width;
                const newWidth = Math.max(0.05, Math.min(1 - note.x, noteStartWidth.current + dx));
                onUpdate(note.id, { width: newWidth });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, note, onUpdate, viewportDimensions]);

    const left = note.x * viewportDimensions.width;
    const top = note.y * viewportDimensions.height;
    const width = (note.width || 0.2) * viewportDimensions.width;

    // Lighter Theme for Liquid Glass
    // If Editing or Expanded: Show content
    // If Collapsed: Show Sticky Note Icon

    return (
        <div
            className="absolute z-20 group"
            style={{
                left,
                top,
                width: note.collapsed ? 'auto' : width,
                transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={handleMouseDown}
        >
            <div
                className={`transition-all duration-300 ${note.collapsed
                    ? 'p-2 hover:scale-110 cursor-pointer drop-shadow-lg'
                    : `min-w-[150px] backdrop-blur-xl bg-white/60 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl p-3 shadow-xl ${isEditing ? 'ring-2 ring-orange-400 z-30 scale-105' : !readOnly ? 'hover:scale-[1.01] cursor-move select-none hover:shadow-2xl' : ''}`
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditing && !readOnly) {
                        if (note.collapsed) onToggleCollapse(note.id);
                        else onClick(note.id);
                    }
                }}
            >
                {/* Icons bar (Only when expanded) */}
                {!readOnly && !note.collapsed && (
                    <div className="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40 delay-75">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleCollapse(note.id); }}
                            className="p-1.5 bg-white text-gray-700 rounded-full hover:bg-gray-100 shadow-md border border-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:border-white/10"
                            title="Collapse to Icon"
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                            className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-md border border-red-200 dark:bg-zinc-800 dark:text-red-400 dark:border-red-900/30"
                            title="Delete"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => {
                                setEditContent(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent border-none p-1 text-sm focus:outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 overflow-hidden"
                            placeholder="Type a note..."
                            style={{
                                minHeight: '60px',
                                color: note.color,
                                fontWeight: note.bold ? 'bold' : 'normal',
                                fontStyle: note.italic ? 'italic' : 'normal',
                                textDecoration: note.underline ? 'underline' : 'none',
                                fontSize: `${note.fontSize}px`,
                                lineHeight: '1.4',
                            }}
                        />
                        <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(note.id); }}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                                className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 rounded-lg shadow-md"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : note.collapsed ? (
                    /* Sticky Note Icon Mode */
                    <div className="relative group">
                        <StickyNote
                            className="w-8 h-8 drop-shadow-md transition-transform group-hover:scale-110"
                            style={{ color: note.color, fill: `${note.color}20` }}
                        />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-white dark:ring-black animate-pulse" />
                    </div>
                ) : (
                    <div
                        className="overflow-hidden whitespace-pre-wrap relative px-1 min-h-[1.5em]"
                        style={{
                            color: note.color,
                            fontWeight: note.bold ? 'bold' : 'normal',
                            fontStyle: note.italic ? 'italic' : 'normal',
                            textDecoration: note.underline ? 'underline' : 'none',
                            fontSize: `${note.fontSize}px`,
                            lineHeight: '1.4',
                        }}
                    >
                        {note.content || <span className="text-gray-400 italic">Empty note</span>}

                        {/* Resize handle */}
                        {!readOnly && (
                            <div
                                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={handleResizeMouseDown}
                            >
                                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-gray-400/50 rounded-full hover:bg-orange-500 transition-colors" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
