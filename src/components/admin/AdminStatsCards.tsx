"use client";

import { api } from "@/app/_trpc/client";
import { Users, FileText, Eye, ThumbsUp, TrendingUp, UserPlus } from "lucide-react";

export function AdminStatsCards() {
    const { data: stats, isLoading } = api.admin.getStats.useQuery();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers.toLocaleString(),
            icon: Users,
            color: "blue",
            trend: `+${stats.recentActivity.users} this week`,
        },
        {
            title: "Total Notes",
            value: stats.totalNotes.toLocaleString(),
            icon: FileText,
            color: "purple",
            trend: `+${stats.recentActivity.notes} this week`,
        },
        {
            title: "Total Views",
            value: stats.totalViews.toLocaleString(),
            icon: Eye,
            color: "green",
            trend: `+${stats.recentActivity.views} this week`,
        },
        {
            title: "Total Votes",
            value: stats.totalVotes.toLocaleString(),
            icon: ThumbsUp,
            color: "orange",
            trend: "All time",
        },
        {
            title: "Total Upvotes",
            value: stats.totalUpvotes.toLocaleString(),
            icon: TrendingUp,
            color: "pink",
            trend: "Net score",
        },
        {
            title: "New Users",
            value: stats.recentActivity.users.toLocaleString(),
            icon: UserPlus,
            color: "indigo",
            trend: "Last 7 days",
        },
    ];

    const colorClasses = {
        blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
        green: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
        orange: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
        pink: "bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
        indigo: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.title}
                        className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {stat.title}
                            </h3>
                            <div className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mb-2">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{stat.trend}</p>
                    </div>
                );
            })}
        </div>
    );
}
