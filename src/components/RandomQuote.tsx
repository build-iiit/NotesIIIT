"use client";

import { useEffect, useState } from "react";
import { Sparkles, PenTool } from "lucide-react";

const QUOTES = [
    "Notes so good, you might actually pass.",
    "Study smarter, not... well, just study.",
    "Your GPA called, it needs these notes.",
    "Because re-watching the lecture at 2x speed isn't enough.",
    "Sharing is caring (and improves your karma).",
    "The night before the exam is a pathway to many abilities some consider to be unnatural.",
    "Knowledge is power. Notes are the battery.",
    "Don't panic. Just read the notes.",
    // New Markdown/Witty Quotes
    "Now with Markdown support: Because plain text is beautiful.",
    "**Boldly** go where no student has gone before.",
    "Writing notes in Markdown makes you look 10x smarter.",
    "`code` is poetry. Your notes should be too.",
    "> Blockquotes are for profound thoughts (or copying the textbook).",
    "Everything looks better in `monospace`.",
    "Structured notes for structured minds.",
    "Markdown: Because formatting shouldn't be a mouse click away.",
    "Syntax highlighting your study material since 2025.",
    "Render your knowledge into success."
];

export function RandomQuote() {
    const [quote, setQuote] = useState<string>("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Randomize on mount only
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        setMounted(true);
    }, []);

    // Show nothing or a skeleton until mounted to match server HTML (empty) or avoid mismatch
    if (!mounted) {
        return <div className="h-7 w-64 bg-gray-200 dark:bg-white/5 rounded-full animate-pulse" />;
    }

    return (
        <p className="text-lg text-gray-600 dark:text-gray-300 italic max-w-lg flex items-center justify-center gap-2 animate-in fade-in duration-500">
            <span className="text-orange-500 text-2xl font-serif">"</span>
            {quote}
            <span className="text-orange-500 text-2xl font-serif">"</span>
        </p>
    );
}
