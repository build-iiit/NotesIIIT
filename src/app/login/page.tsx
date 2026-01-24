import { signIn } from "@/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Github } from "lucide-react"

export default function SignIn() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12 sm:px-6 lg:px-8 relative dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 transition-colors duration-500">
            <div className="absolute top-4 right-4">
                <ThemeToggle className="text-white hover:bg-white/20" />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <div className="bg-white/20 p-4 rounded-full mb-4 shadow-lg backdrop-blur-sm border border-white/30">
                    <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-center text-4xl font-extrabold text-white drop-shadow-md tracking-tight">
                    NotesIIIT
                </h1>
                <p className="mt-2 text-center text-lg text-white/90 font-medium">
                    Share notes, collaborate, and excel.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
                        <h2 className="text-xl font-semibold text-white">Sign in to your account</h2>

                        <form
                            className="w-full"
                            action={async () => {
                                "use server"
                                await signIn("github", { redirectTo: "/" })
                            }}
                        >
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-indigo-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:shadow-xl gap-2"
                            >
                                <Github className="h-5 w-5" />
                                <span>Sign in with GitHub</span>
                            </button>
                        </form>
                    </div>
                </div>
                <p className="mt-6 text-center text-xs text-white/60">
                    &copy; {new Date().getFullYear()} NotesIIIT. All rights reserved.
                </p>
            </div>
        </div>
    )
}
