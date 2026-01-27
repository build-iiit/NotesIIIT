"use client";

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
    useCallback,
} from 'react';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Minus,
    Calculator,
    Type,
} from 'lucide-react';

/**
 * Slash Command Extension
 * Provides a "/" menu for inserting block types
 */

interface CommandItem {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    command: (props: { editor: any; range: any }) => void;
}

const COMMANDS: CommandItem[] = [
    {
        title: 'Text',
        description: 'Just start writing with plain text',
        icon: Type,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
        },
    },
    {
        title: 'Heading 1',
        description: 'Large section heading',
        icon: Heading1,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: Heading2,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading',
        icon: Heading3,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Create a simple bullet list',
        icon: List,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered List',
        description: 'Create a numbered list',
        icon: ListOrdered,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'Quote',
        description: 'Capture a quote',
        icon: Quote,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Code Block',
        description: 'Capture a code snippet',
        icon: Code,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
    {
        title: 'Divider',
        description: 'Visual divider line',
        icon: Minus,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    {
        title: 'Math Block',
        description: 'Insert a LaTeX equation',
        icon: Calculator,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({ type: 'mathBlock', attrs: { latex: '' } })
                .run();
        },
    },
];

interface CommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
    ({ items, command }, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0);

        const selectItem = useCallback(
            (index: number) => {
                const item = items[index];
                if (item) {
                    command(item);
                }
            },
            [items, command]
        );

        const upHandler = useCallback(() => {
            setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        }, [items.length]);

        const downHandler = useCallback(() => {
            setSelectedIndex((prev) => (prev + 1) % items.length);
        }, [items.length]);

        const enterHandler = useCallback(() => {
            selectItem(selectedIndex);
        }, [selectItem, selectedIndex]);

        useEffect(() => {
            setSelectedIndex(0);
        }, [items]);

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }) => {
                if (event.key === 'ArrowUp') {
                    upHandler();
                    return true;
                }
                if (event.key === 'ArrowDown') {
                    downHandler();
                    return true;
                }
                if (event.key === 'Enter') {
                    enterHandler();
                    return true;
                }
                return false;
            },
        }));

        if (items.length === 0) {
            return (
                <div className="slash-command-menu">
                    <div className="slash-command-empty">No results</div>
                </div>
            );
        }

        return (
            <div className="slash-command-menu">
                {items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.title}
                            className={`slash-command-item ${index === selectedIndex ? 'slash-command-item-selected' : ''
                                }`}
                            onClick={() => selectItem(index)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className="slash-command-icon">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="slash-command-content">
                                <div className="slash-command-title">{item.title}</div>
                                <div className="slash-command-description">{item.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }
);

CommandList.displayName = 'CommandList';

const suggestion: Omit<SuggestionOptions, 'editor'> = {
    items: ({ query }: { query: string }) => {
        return COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
    },

    render: () => {
        let component: ReactRenderer | null = null;
        let popup: TippyInstance[] | null = null;

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: any) {
                component?.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup?.[0]?.hide();
                    return true;
                }

                return (component?.ref as CommandListRef)?.onKeyDown(props) ?? false;
            },

            onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
            },
        };
    },
};

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
                    props.command({ editor, range });
                },
                ...suggestion,
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export default SlashCommand;
