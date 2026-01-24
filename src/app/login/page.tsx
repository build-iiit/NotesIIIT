import { signIn } from "@/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Github } from "lucide-react"

export default function SignIn() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-500">
            <div className="absolute top-4 right-4">
                <ThemeToggle className="backdrop-blur-2xl bg-white/10 dark:bg-black/20 text-white hover:bg-white/20 dark:hover:bg-black/30 border border-white/30 p-2 rounded-xl transition-all hover:scale-[1.05]" />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <div className="backdrop-blur-2xl bg-white/15 dark:bg-black/25 p-5 rounded-full mb-4 shadow-[0_16px_40px_0_rgba(0,0,0,0.2)] border border-white/40 dark:border-white/25">
                    <BookOpen className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                <h1 className="text-center text-5xl font-extrabold bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
                    NotesIIIT
                </h1>
                <p className="mt-2 text-center text-lg text-white/95 font-medium drop-shadow-md">
                    Share notes, collaborate, and excel.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.12] dark:from-black/20 dark:via-black/15 dark:to-black/20 border border-white/30 dark:border-white/20 py-10 px-4 shadow-[0_24px_64px_0_rgba(0,0,0,0.25)] sm:rounded-3xl sm:px-12 overflow-hidden group">
                    {/* Layered glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
                        <h2 className="text-xl font-semibold text-white drop-shadow-md">Sign in to your account</h2>

                        <form
                            className="w-full"
                            action={async () => {
                                "use server"
                                await signIn("github", { redirectTo: "/" })
                            }}
                        >
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center py-3 px-4 text-sm font-bold text-gray-800 dark:text-gray-200 relative rounded-xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] gap-2"
                            >
                                <Github className="h-5 w-5" />
                                <span>Sign in with GitHub</span>
                            </button>
                        </form>
                    </div>
                </div>
                <p className="mt-6 text-center text-xs text-white/70 drop-shadow">
                    &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
                </p>
            </div>
        </div>
    )
}
