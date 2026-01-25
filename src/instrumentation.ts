
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Polyfill DOMMatrix for pdfjs-dist (v5+) in Node.js environment
        // preventing "DOMMatrix is not defined" crash when default build is loaded.
        if (typeof global.DOMMatrix === "undefined") {
            // @ts-ignore - Minimal polyfill
            global.DOMMatrix = class DOMMatrix {
                constructor() { }
            } as any;
        }
    }
}
