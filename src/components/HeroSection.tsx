import Link from "next/link";

export function HeroSection() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Share Notes. <br /> Ace Exams.
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
                The ultimate platform for IIIT students to share lecture notes,
                collaborate on study materials, and help each other succeed.
            </p>
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                    Get Started
                </Link>
                <Link
                    href="/leaderboard"
                    className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 px-8 py-3 rounded-full font-semibold text-lg border hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    View Leaderboard
                </Link>
            </div>
        </div>
    );
}
