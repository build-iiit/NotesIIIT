import { api } from "@/app/_trpc/server";
import { UserProfileClient } from "./UserProfileClient";
import { auth } from "@/auth";
import { Trophy } from "lucide-react";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await api.auth.getProfile({ userId: id });

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
                        <Trophy className="h-12 w-12 text-red-500 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">User not found</h1>
                    <p className="text-gray-500 dark:text-gray-400">This user doesn&apos;t exist or has been removed.</p>
                </div>
            </div>
        );
    }

    // Determine achievement badges
    // Determine achievement badges
    const achievements = [];
    if (user._count.notes >= 1) achievements.push({ iconName: "Sparkles", label: "First Note", color: "blue" });
    if (user._count.notes >= 5) achievements.push({ iconName: "Award", label: "5 Notes", color: "purple" });
    if (user._count.notes >= 10) achievements.push({ iconName: "Trophy", label: "10 Notes", color: "yellow" });
    if (user.rank <= 10) achievements.push({ iconName: "Medal", label: "Top 10", color: "gold" });
    if (user.totalKarma >= 50) achievements.push({ iconName: "TrendingUp", label: "50 Karma", color: "green" });

    const session = await auth();

    return <UserProfileClient user={user} achievements={achievements} currentUserId={session?.user?.id} />;
}
