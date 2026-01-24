import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
    return (
        <div className="min-h-screen p-8 sm:p-24">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Hall of Fame</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Recognizing the students driving the community forward.
                    </p>
                </div>

                <LeaderboardTable />
            </div>
        </div>
    );
}
