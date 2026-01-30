"use client"

import { parse } from "path"
import { handleGithubSignIn } from "./actions"
import { Github } from "lucide-react"

export function SignInForm() {
    return (
        <div className="w-full">
            <button
                onClick={() => handleGithubSignIn()}
                className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-gray-800 dark:text-gray-200 relative rounded-xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] gap-2"
            >
                <Github className="h-5 w-5" />
                <span>Sign in with GitHub</span>
            </button>
        </div>
    )
}
