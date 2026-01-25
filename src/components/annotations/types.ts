export interface Point {
    x: number; // 0-1 relative to page width
    y: number; // 0-1 relative to page height
}

export interface Stroke {
    points: Point[];
    color: string;
    type: "pen" | "highlighter";
    width: number;
}

export interface TextNote {
    id: string;
    x: number; // 0-1 relative to page width
    y: number; // 0-1 relative to page height
    content: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    width: number; // 0-1 relative to page width
    fontSize: number; // in pixels
    collapsed?: boolean; // Reserved for backward compatibility
    displayMode: "open" | "collapsed-line" | "collapsed-icon";
    createdAt: number;
    updatedAt: number;
}

export interface PageAnnotations {
    strokes?: Stroke[];
    textNotes?: TextNote[];
}
