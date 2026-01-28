"use client";

import { api } from "@/app/_trpc/client";
import {
    Users,
    FileText,
    Eye,
    ThumbsUp,
    TrendingUp,
    TrendingDown,
    BookOpen,
    MessageSquare,
    Flag,
    AlertTriangle,
    Ban,
    EyeOff,
    Crown,
    Shield
} from "lucide-react";

export function AdminStatsCards() {
    const { data: stats, isLoading } = api.admin.getStats.useQuery();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 mb-3"></div>
                            <div className="h-7 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const mainStats = [
        {
            title: "Total Users",
            value: stats.totalUsers.toLocaleString(),
            icon: Users,
            color: "blue",
            trend: `+${stats.recentActivity.users} this week`,
            growth: stats.growth?.users,
        },
        {
            title: "Total Notes",
            value: stats.totalNotes.toLocaleString(),
            icon: FileText,
            color: "purple",
            trend: `+${stats.recentActivity.notes} this week`,
            growth: stats.growth?.notes,
        },
        {
            title: "Total Views",
            value: stats.totalViews.toLocaleString(),
            icon: Eye,
            color: "green",
            trend: `+${stats.recentActivity.views} this week`,
            growth: stats.growth?.views,
        },
        {
            title: "Total Votes",
            value: stats.totalVotes.toLocaleString(),
            icon: ThumbsUp,
            color: "orange",
            trend: `${stats.totalUpvotes >= 0 ? "+" : ""}${stats.totalUpvotes} net score`,
        },
    ];

    const secondaryStats = [
        {
            title: "Total Courses",
            value: stats.totalCourses.toLocaleString(),
            icon: BookOpen,
            color: "indigo",
        },
        {
            title: "Comments",
            value: stats.totalComments?.toLocaleString() || "0",
            icon: MessageSquare,
            color: "cyan",
        },
    ];

    const moderationStats = [
        {
            title: "Pending Reports",
            value: stats.moderation?.pendingReports || 0,
            icon: Flag,
            color: stats.moderation?.pendingReports > 0 ? "red" : "gray",
            urgent: (stats.moderation?.pendingReports || 0) > 0,
        },
        {
            title: "Hidden Notes",
            value: stats.moderation?.hiddenNotes || 0,
            icon: EyeOff,
            color: "amber",
        },
        {
            title: "Suspended Users",
            value: stats.moderation?.suspendedUsers || 0,
            icon: AlertTriangle,
            color: "amber",
        },
        {
            title: "Banned Users",
            value: stats.moderation?.bannedUsers || 0,
            icon: Ban,
            color: "red",
        },
    ];

    const colorClasses: Record<string, string> = {
        blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
        green: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
        orange: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
        pink: "bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
        indigo: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
        cyan: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
        red: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
        amber: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
        gray: "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400",
    };

    const roleIcons: Record<string, React.ReactNode> = {
        SUPER_ADMIN: <Crown className="w-3 h-3" />,
        ADMIN: <Shield className="w-3 h-3" />,
        MODERATOR: <Shield className="w-3 h-3" />,
        USER: <Users className="w-3 h-3" />,
    };

    const roleColors: Record<string, string> = {
        SUPER_ADMIN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        MODERATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        USER: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400",
    };

    return (
        <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainStats.map((stat) => {
                    const Icon = stat.icon;
                    const hasGrowth = typeof stat.growth === "number";
                    const isPositiveGrowth = hasGrowth && stat.growth >= 0;

                    return (
                        <div
                            key={stat.title}
                            className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all hover:border-gray-300 dark:hover:border-zinc-700"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {stat.title}
                                </h3>
                                <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold mb-1">{stat.value}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.trend}</p>
                                {hasGrowth && (
                                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositiveGrowth ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                        {isPositiveGrowth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(stat.growth)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Secondary Stats & Moderation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Secondary Stats */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Platform Stats</h3>
                    <div className="space-y-3">
                        {secondaryStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.title} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded ${colorClasses[stat.color]}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</span>
                                    </div>
                                    <span className="font-semibold">{stat.value}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Moderation Queue */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Moderation Queue</h3>
                    <div className="space-y-3">
                        {moderationStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.title} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded ${colorClasses[stat.color]}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</span>
                                    </div>
                                    <span className={`font-semibold ${stat.urgent ? "text-red-600 dark:text-red-400" : ""}`}>
                                        {stat.value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* User Breakdown by Role */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Users by Role</h3>
                    <div className="space-y-2">
                        {stats.userBreakdown?.byRole?.map((item: { role: string, count: number }) => (
                            <div key={item.role} className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[item.role] || roleColors.USER}`}>
                                    {roleIcons[item.role] || roleIcons.USER}
                                    {item.role.replace("_", " ")}
                                </span>
                                <span className="font-semibold text-sm">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Monthly Stats & Top Contributors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 30-Day Summary */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Last 30 Days</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {stats.monthly?.notes || 0}
                            </p>
                            <p className="text-xs text-gray-500">New Notes</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.monthly?.users || 0}
                            </p>
                            <p className="text-xs text-gray-500">New Users</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {(stats.monthly?.views || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Views</p>
                        </div>
                    </div>
                </div>

                {/* Top Contributors */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Top Contributors (30d)</h3>
                    {stats.topContributors?.length > 0 ? (
                        <div className="space-y-2">
                            {stats.topContributors.map((contributor: { id: string, name: string | null, email: string | null, notesThisMonth: number }, index: number) => (
                                <div key={contributor.id} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-gray-200 text-gray-700" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-sm truncate max-w-[150px]">
                                            {contributor.name || contributor.email || "Anonymous"}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                        {contributor.notesThisMonth} notes
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No contributions yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}
