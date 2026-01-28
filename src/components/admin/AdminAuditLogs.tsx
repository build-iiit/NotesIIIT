"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import {
    ScrollText,
    Search,
    Loader2,
    Download,
    Filter,
    User,
    FileText,
    Settings,
    Flag,
    Shield,
    ChevronDown,
    ChevronRight,
    Calendar,
    Clock
} from "lucide-react";

type AuditCategory = "USER_MANAGEMENT" | "CONTENT_MODERATION" | "SETTINGS" | "SYSTEM" | "REPORTS";

const categoryColors: Record<AuditCategory, string> = {
    USER_MANAGEMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    CONTENT_MODERATION: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    SETTINGS: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    SYSTEM: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400",
    REPORTS: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const categoryIcons: Record<AuditCategory, React.ReactNode> = {
    USER_MANAGEMENT: <User className="w-4 h-4" />,
    CONTENT_MODERATION: <FileText className="w-4 h-4" />,
    SETTINGS: <Settings className="w-4 h-4" />,
    SYSTEM: <Shield className="w-4 h-4" />,
    REPORTS: <Flag className="w-4 h-4" />,
};

export function AdminAuditLogs() {
    const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "ALL">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
        api.audit.getLogs.useInfiniteQuery(
            {
                category: categoryFilter === "ALL" ? undefined : categoryFilter,
                search: searchQuery || undefined,
                startDate: dateRange.from ? new Date(dateRange.from) : undefined,
                endDate: dateRange.to ? new Date(dateRange.to) : undefined,
                limit: 25,
            },
            {
                getNextPageParam: (lastPage) => lastPage.nextCursor,
            }
        );

    const { data: stats } = api.audit.getStats.useQuery();

    const allLogs = data?.pages.flatMap((page) => page.logs) || [];

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: "json" | "csv") => {
        setIsExporting(true);

        try {
            // Use the current logs data for export
            const logsToExport = allLogs;

            if (format === "csv") {
                const csvHeader = "ID,Timestamp,Admin Email,Action,Category,Target Type,Target ID\n";
                const csvRows = logsToExport.map(log =>
                    `"${log.id}","${new Date(log.createdAt).toISOString()}","${log.adminEmail}","${log.action}","${log.category}","${log.targetType || ""}","${log.targetId || ""}"`
                ).join("\n");
                const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const blob = new Blob([JSON.stringify(logsToExport, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } finally {
            setIsExporting(false);
        }
    };

    const formatAction = (action: string) => {
        return action
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" → ");
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(date));
    };

    return (
        <div className="space-y-4">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-gray-500">Total Logs</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="text-2xl font-bold">{stats.today}</div>
                        <div className="text-sm text-gray-500">Today</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="text-2xl font-bold">{stats.byCategory.length}</div>
                        <div className="text-sm text-gray-500">Categories</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="text-2xl font-bold">{stats.topAdmins.length}</div>
                        <div className="text-sm text-gray-500">Active Admins</div>
                    </div>
                </div>
            )}

            {/* Filters and search */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by action, admin, or target..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        />
                    </div>

                    {/* Category filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as AuditCategory | "ALL")}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="USER_MANAGEMENT">User Management</option>
                            <option value="CONTENT_MODERATION">Content Moderation</option>
                            <option value="SETTINGS">Settings</option>
                            <option value="REPORTS">Reports</option>
                            <option value="SYSTEM">System</option>
                        </select>
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dateRange.from || ""}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={dateRange.to || ""}
                            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                            className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        />
                    </div>

                    {/* Export */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleExport("json")}
                            disabled={isExporting}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            JSON
                        </button>
                        <button
                            onClick={() => handleExport("csv")}
                            disabled={isExporting}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs list */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Loading audit logs...</p>
                    </div>
                ) : allLogs.length > 0 ? (
                    <>
                        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                            {allLogs.map((log) => (
                                <div key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                    {/* Log summary */}
                                    <div
                                        className="px-6 py-4 cursor-pointer"
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Category icon */}
                                            <div className={`p-2 rounded-lg ${categoryColors[log.category as AuditCategory]}`}>
                                                {categoryIcons[log.category as AuditCategory]}
                                            </div>

                                            {/* Log info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">{formatAction(log.action)}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[log.category as AuditCategory]}`}>
                                                        {log.category.replace("_", " ")}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {log.admin?.name || log.adminEmail}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(log.createdAt)}
                                                    </span>
                                                    {log.targetType && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                {log.targetType}: {log.targetId?.slice(0, 8)}...
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expand indicator */}
                                            {expandedLog === log.id ? (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {expandedLog === log.id && (
                                        <div className="px-6 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-4 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Before state */}
                                                {log.beforeState && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                                            Before
                                                        </h4>
                                                        <pre className="text-xs bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg overflow-auto max-h-40">
                                                            {JSON.stringify(log.beforeState, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* After state */}
                                                {log.afterState && (
                                                    <div>
                                                        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                                            After
                                                        </h4>
                                                        <pre className="text-xs bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg overflow-auto max-h-40">
                                                            {JSON.stringify(log.afterState, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="mt-4 text-xs text-gray-500 space-y-1">
                                                <div>
                                                    <strong>Log ID:</strong> {log.id}
                                                </div>
                                                {log.ipAddress && (
                                                    <div>
                                                        <strong>IP Address:</strong> {log.ipAddress}
                                                    </div>
                                                )}
                                                {log.userAgent && (
                                                    <div>
                                                        <strong>User Agent:</strong>{" "}
                                                        <span className="truncate">{log.userAgent.slice(0, 100)}...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Load more */}
                        {hasNextPage && (
                            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 text-center">
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                                >
                                    {isFetchingNextPage ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        "Load More"
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-12 text-center">
                        <ScrollText className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">No Audit Logs</h3>
                        <p className="text-gray-500">
                            {searchQuery || categoryFilter !== "ALL"
                                ? "No logs match your filters."
                                : "No admin actions have been logged yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
