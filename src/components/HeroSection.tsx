import Link from "next/link";

export function HeroSection() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] bg-clip-text text-transparent">
                Share Notes. <br /> Ace Exams.
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
                The ultimate platform for IIIT students to share lecture notes,
                collaborate on study materials, and help each other succeed.
            </p>
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="px-8 py-3 rounded-full font-semibold text-lg text-gray-800 dark:text-gray-200 backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:bg-primary/10 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-xl border border-white/25 hover:border-primary/50 hover:scale-[1.08] active:scale-[0.95]"
                >
                    Get Started
                </Link>
                <Link
                    href="/leaderboard"
                    className="px-8 py-3 rounded-full font-semibold text-lg text-gray-800 dark:text-gray-200 backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:bg-primary/10 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-xl border border-white/25 hover:border-primary/50 hover:scale-[1.08] active:scale-[0.95]"
                >
                    View Leaderboard
                </Link>
            </div>
        </div>
    );
}
