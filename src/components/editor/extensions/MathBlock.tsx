import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * MathBlock Extension
 * Renders block math like $$...$$ using KaTeX
 */

function MathBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const latexValue = (node.attrs.latex as string) || '';
    const [latex, setLatex] = useState(latexValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setLatex(latexValue);
    }, [latexValue]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleSave = useCallback(() => {
        updateAttributes({ latex });
        setIsEditing(false);
    }, [latex, updateAttributes]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setLatex(latexValue);
            setIsEditing(false);
        }
        // Allow Enter for multiline, use Ctrl/Cmd+Enter to save
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    }, [handleSave, latexValue]);

    if (isEditing) {
        return (
            <NodeViewWrapper className="math-block-wrapper math-block-editing">
                <textarea
                    ref={textareaRef}
                    value={latex}
                    onChange={(e) => setLatex(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="math-block-input"
                    placeholder="LaTeX equation..."
                    rows={3}
                />
                <div className="math-block-hint">Press Ctrl+Enter to save, Escape to cancel</div>
            </NodeViewWrapper>
        );
    }

    let rendered = '';
    try {
        rendered = katex.renderToString(latexValue || '\\text{Click to add equation}', {
            throwOnError: false,
            displayMode: true,
        });
    } catch {
        rendered = `<span class="math-error">${latexValue}</span>`;
    }

    return (
        <NodeViewWrapper
            className={`math-block ${selected ? 'math-selected' : ''}`}
            onClick={() => setIsEditing(true)}
            contentEditable={false}
        >
            <div
                className="math-block-content"
                dangerouslySetInnerHTML={{ __html: rendered }}
            />
        </NodeViewWrapper>
    );
}

export const MathBlock = Node.create({
    name: 'mathBlock',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            latex: {
                default: '',
                parseHTML: element => element.getAttribute('data-latex') || element.textContent || '',
                renderHTML: attributes => ({
                    'data-latex': attributes.latex,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="math-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathBlockNodeView);
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-m': () => {
                return this.editor.commands.insertContent({
                    type: this.name,
                    attrs: { latex: '' },
                });
            },
        };
    },
});

export default MathBlock;
