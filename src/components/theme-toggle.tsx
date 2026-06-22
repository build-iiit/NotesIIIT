"use client"

import * as React from"react"
import { Moon, Sun, Sparkles } from"lucide-react"
import { useTheme } from"next-themes"

export function ThemeToggle({ className }: { className?: string }) {
 const { theme, setTheme } = useTheme()
 const [mounted, setMounted] = React.useState(false)

 // Avoid hydration mismatch
 React.useEffect(() => {
 setMounted(true)
 }, [])

 if (!mounted) {
 return (
 <button className={`p-2 rounded-full relative bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:bg-primary/10 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_var(--glow-color)] border border-white/25 hover:border-primary/50 hover:scale-[1.08] active:scale-[0.95] ${className}`} aria-label="Toggle theme">
 <div className="w-5 h-5" />
 </button>
 )
 }


 return (
 <button
 onClick={() => setTheme(theme ==="dark" ?"light" :"dark")}
 className={`relative p-2 rounded-full bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:bg-primary/10 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_var(--glow-color)] border border-white/25 hover:border-primary/50 hover:scale-[1.08] active:scale-[0.95] ${className}`}
 aria-label="Toggle theme"
 title={`Current theme: ${theme}`}
 >
 {theme ==='dark' && <Moon className="h-5 w-5 text-white" />}
 {theme ==='light' && <Sun className="h-5 w-5 text-indigo-900" />}
 {theme ==='' && <Sparkles className="h-5 w-5 text-purple-300" />}
 </button>
 )
}
