"use client";

import { api } from "@/app/_trpc/client";
import {
    Database,
    Activity,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    FileText,
    Users,
    MessageSquare,
    Eye,
    ThumbsUp,
    Flag,
    ScrollText,
    BookOpen,
} from "lucide-react";

export function AdminSystemHealth() {
    const { data: health, isLoading, refetch, isRefetching } = api.admin.getSystemHealth.useQuery(
        undefined,
        { refetchInterval: 60000 } // Refresh every minute
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 mb-3"></div>
                            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!health) return null;

    const tableIcons: Record<string, React.ReactNode> = {
        Users: <Users className="w-4 h-4" />,
        Notes: <FileText className="w-4 h-4" />,
        Comments: <MessageSquare className="w-4 h-4" />,
        Views: <Eye className="w-4 h-4" />,
        Votes: <ThumbsUp className="w-4 h-4" />,
        Reports: <Flag className="w-4 h-4" />,
        "Audit Logs": <ScrollText className="w-4 h-4" />,
        Courses: <BookOpen className="w-4 h-4" />,
    };

    const isHealthy = health.health.status === "healthy";

    return (
        <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">System Health</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last updated: {new Date(health.timestamp).toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Health Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${isHealthy
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                }`}>
                {isHealthy ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                    <p className={`font-medium ${isHealthy ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}>
                        System is {isHealthy ? "Healthy" : "Requires Attention"}
                    </p>
                    {!isHealthy && (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            {health.health.pendingReports} pending reports need review
                        </p>
                    )}
                </div>
            </div>

            {/* Activity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</h3>
                    </div>
                    <p className="text-2xl font-bold">{health.activity.activeUsersLastHour}</p>
                    <p className="text-xs text-gray-500 mt-1">In the last hour</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">New Notes</h3>
                    </div>
                    <p className="text-2xl font-bold">{health.activity.newNotesToday}</p>
                    <p className="text-xs text-gray-500 mt-1">Today</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Views</h3>
                    </div>
                    <p className="text-2xl font-bold">{health.activity.viewsToday.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Today</p>
                </div>
            </div>

            {/* Database Stats */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-medium">Database Overview</h3>
                    <span className="ml-auto text-sm text-gray-500">
                        {health.database.totalRecords.toLocaleString()} total records
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {health.database.tables.map((table: { name: string; count: number }) => (
                        <div
                            key={table.name}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">
                                    {tableIcons[table.name] || <Database className="w-4 h-4" />}
                                </span>
                                <span className="text-sm font-medium">{table.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {table.count.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Moderation Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="font-medium mb-4">Moderation Queue</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Pending Reports</span>
                            <span className={`font-semibold ${health.health.pendingReports > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                                {health.health.pendingReports}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Hidden Content</span>
                            <span className="font-semibold">{health.health.hiddenContent}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
                    <h3 className="font-medium mb-4">Content Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Avg Views per Note</span>
                            <span className="font-semibold">{Math.round(health.health.avgViews)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Max Views</span>
                            <span className="font-semibold">{health.health.maxViews.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
