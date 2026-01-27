"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeStyle = "sunset" | "monochrome";

interface ThemeStyleContextType {
    themeStyle: ThemeStyle;
    setThemeStyle: (style: ThemeStyle) => void;
}

const ThemeStyleContext = createContext<ThemeStyleContextType | undefined>(undefined);

export function ThemeStyleProvider({ children }: { children: React.ReactNode }) {
    const [themeStyle, setThemeStyleState] = useState<ThemeStyle>("sunset");

    useEffect(() => {
        const stored = localStorage.getItem("theme-style") as ThemeStyle;
        if (stored) {
            // eslint-disable-next-line react-compiler/react-compiler
            setThemeStyleState(stored);
            if (stored === "monochrome") {
                document.documentElement.classList.add("monochrome");
            } else {
                document.documentElement.classList.remove("monochrome");
            }
        }
    }, []);

    const setThemeStyle = (style: ThemeStyle) => {
        setThemeStyleState(style);
        localStorage.setItem("theme-style", style);
        if (style === "monochrome") {
            document.documentElement.classList.add("monochrome");
        } else {
            document.documentElement.classList.remove("monochrome");
        }
    };

    // Return children immediately to avoid hydration mismatch if possible, 
    // but for theme classes we often need to wait for mount or script.
    // However, to avoid flash/layout shift, we might render anyway.
    // Since we modifying class on documentElement, children rendering shouldn't be blocked 
    // strictly, but let's be safe.
    // If we don't render children until mounted, we get a blank screen flash.
    // We should render children.

    return (
        <ThemeStyleContext.Provider value={{ themeStyle, setThemeStyle }}>
            {children}
        </ThemeStyleContext.Provider>
    );
}

export function useThemeStyle() {
    const context = useContext(ThemeStyleContext);
    if (context === undefined) {
        throw new Error("useThemeStyle must be used within a ThemeStyleProvider");
    }
    return context;
}
