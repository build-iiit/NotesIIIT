"use client"

import * as React from "react"
import { Moon, Sun, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className={`p-2 rounded-md hover:bg-white/10 transition-colors ${className}`} aria-label="Toggle theme">
                <div className="w-5 h-5" />
            </button>
        )
    }

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('glass')
        else setTheme('light')
    }

    return (
        <button
            onClick={cycleTheme}
            className={`relative p-2 rounded-md hover:bg-white/10 transition-colors ${className}`}
            aria-label="Toggle theme"
            title={`Current theme: ${theme}`}
        >
            {theme === 'dark' && <Moon className="h-5 w-5 text-white" />}
            {theme === 'light' && <Sun className="h-5 w-5 text-indigo-900" />}
            {theme === 'glass' && <Sparkles className="h-5 w-5 text-purple-300" />}
        </button>
    )
}
