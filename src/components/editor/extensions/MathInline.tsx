import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import type { ExtendedRegExpMatchArray } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useState, useCallback, useEffect, useRef } from 'react';
import { escapeHtml } from '@/lib/utils';

/**
 * MathInline Extension
 * Renders inline math like $x^2$ using KaTeX
 */

function MathInlineNodeView({ node, updateAttributes, selected }: NodeViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const latexValue = (node.attrs.latex as string) || '';
    const [latex, setLatex] = useState(latexValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLatex(latexValue);
    }, [latexValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = useCallback(() => {
        updateAttributes({ latex });
        setIsEditing(false);
    }, [latex, updateAttributes]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setLatex(latexValue);
            setIsEditing(false);
        }
    }, [handleSave, latexValue]);

    if (isEditing) {
        return (
            <NodeViewWrapper as="span" className="math-inline-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={latex}
                    onChange={(e) => setLatex(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="math-inline-input"
                    placeholder="LaTeX..."
                />
            </NodeViewWrapper>
        );
    }

    let rendered = '';
    try {
        rendered = katex.renderToString(latexValue || '', {
            throwOnError: false,
            displayMode: false,
        });
    } catch {
        rendered = `<span class="math-error">${escapeHtml(latexValue)}</span>`;
    }

    return (
        <NodeViewWrapper
            as="span"
            className={`math-inline ${selected ? 'math-selected' : ''}`}
            onClick={() => setIsEditing(true)}
            contentEditable={false}
        >
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
        </NodeViewWrapper>
    );
}

// Regex to match inline math: $...$
// Match $, then any non-empty content not containing $, then $
const inputRegex = /(?:^|\s)\$([^$]+)\$$/;

export const MathInline = Node.create({
    name: 'mathInline',
    group: 'inline',
    inline: true,
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
                tag: 'span[data-type="math-inline"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathInlineNodeView);
    },

    addInputRules() {
        return [
            new InputRule({
                find: inputRegex,
                handler: ({ state, range, match, chain }) => {
                    const latex = match[1];
                    if (!latex) return;

                    // Calculate the actual start position (accounting for leading space/start)
                    const fullMatch = match[0];
                    const leadingSpace = fullMatch.startsWith(' ') ? 1 : 0;
                    const start = range.from + leadingSpace;

                    // Use chain to properly delete and insert
                    chain()
                        .deleteRange({ from: start, to: range.to })
                        .insertContentAt(start, {
                            type: this.name,
                            attrs: { latex },
                        })
                        .run();
                },
            }),
        ];
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-e': () => {
                return this.editor.commands.insertContent({
                    type: this.name,
                    attrs: { latex: '' },
                });
            },
        };
    },
});

export default MathInline;

