"use client";

import { useEffect, useState } from "react";

const QUOTES = [
    "Notes so good, you might actually pass.",
    "Study smarter, not... well, just study.",
    "Your GPA called, it needs these notes.",
    "Because re-watching the lecture at 2x speed isn't enough.",
    "Sharing is caring (and improves your karma).",
    "The night before the exam is a pathway to many abilities some consider to be unnatural.",
    "Knowledge is power. Notes are the battery.",
    "Don't panic. Just read the notes.",
    "Academic weapon in the making.",
    "Powered by caffeine and last-minute panic.",
    "For when you zoned out during the important part."
];

export function RandomQuote() {
    const [quote, setQuote] = useState(QUOTES[0]);

    useEffect(() => {
        // Randomize on mount
        // eslint-disable-next-line react-compiler/react-compiler
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, []);

    return (
        <p className="text-lg text-gray-600 dark:text-gray-300 italic max-w-lg min-h-[3rem] transition-opacity duration-500">
            &quot;{quote}&quot;
        </p>
    );
}
