import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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

    const firstLine = note.content.split('\n')[0] || "Empty Note";
    const displayContent = note.collapsed ? (firstLine.length > 30 ? firstLine.substring(0, 30) + "..." : firstLine) : note.content;

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
                className={`min-w-[120px] backdrop-blur-[1px] border rounded p-1 transition-all ${isEditing ? 'bg-white/10 ring-1 ring-blue-500/40 z-30 border-white/20' : !readOnly ? 'hover:scale-[1.01] cursor-move select-none border-white/5 hover:border-white/20' : 'border-white/5'}`}
                style={{
                    backgroundColor: `${note.color}11`, // 11 is hex for ~7% opacity
                    borderColor: `${note.color}44`, // 44 is hex for ~25% opacity
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditing && !readOnly) onClick(note.id);
                }}
            >
                {/* Icons bar */}
                {!readOnly && (
                    <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleCollapse(note.id); }}
                            className="p-1 bg-zinc-800 text-white rounded-full hover:bg-zinc-700"
                            title={note.collapsed ? "Expand" : "Collapse"}
                        >
                            {note.collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                            className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
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
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[80px] bg-white/50 dark:bg-black/20 border border-white/20 rounded p-1 text-sm focus:outline-none resize-none"
                            placeholder="Type your note..."
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(note.id); }}
                                className="px-2 py-1 text-xs text-gray-400 hover:bg-white/10 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                                className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded shadow"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        className={`overflow-hidden whitespace-pre-wrap relative ${note.collapsed ? 'truncate max-h-[1.5em]' : ''}`}
                        style={{
                            color: note.color,
                            fontWeight: note.bold ? 'bold' : 'normal',
                            fontStyle: note.italic ? 'italic' : 'normal',
                            textDecoration: note.underline ? 'underline' : 'none',
                            fontSize: `${note.fontSize}px`,
                            lineHeight: '1.4',
                        }}
                    >
                        {displayContent}
                        {note.collapsed && note.content.includes('\n') && <span className="text-[10px] opacity-50 block italic">... (click to expand)</span>}

                        {/* Resize handle */}
                        {!readOnly && !note.collapsed && (
                            <div
                                className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={handleResizeMouseDown}
                            >
                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white/40 rounded-full" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
