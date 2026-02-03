import { SignInForm } from "./SignInForm"
import { BookOpen } from "lucide-react"

export default function SignIn() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-500">
            {/* Removed redundant theme toggle - navbar already has one */}

            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <div className="relative backdrop-blur-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 p-6 rounded-full mb-6 shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-orange-400/30">
                    <BookOpen className="h-14 w-14 text-orange-500 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                </div>
                <h1 className="text-center text-6xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
                    iiitNotes
                </h1>
                <p className="mt-3 text-center text-lg text-white/90 font-medium drop-shadow-md">
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

                        <SignInForm />
                    </div>
                </div>
                <p className="mt-6 text-center text-xs text-white/70 drop-shadow">
                    &copy; {new Date().getFullYear()} iiitNotes. All rights reserved.
                </p>
                </div>
        </div>
    )
}
