"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import {
    Flag,
    Search,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    User,
    FileText,
    MessageSquare,
    ExternalLink,
    ChevronDown,
    Filter
} from "lucide-react";
import Link from "next/link";

type ReportStatus = "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
type TargetType = "NOTE" | "PAGE" | "COMMENT" | "USER";

const statusColors: Record<ReportStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    UNDER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    DISMISSED: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400",
};

const statusIcons: Record<ReportStatus, React.ReactNode> = {
    PENDING: <Clock className="w-4 h-4" />,
    UNDER_REVIEW: <AlertTriangle className="w-4 h-4" />,
    RESOLVED: <CheckCircle className="w-4 h-4" />,
    DISMISSED: <XCircle className="w-4 h-4" />,
};

const targetIcons: Record<TargetType, React.ReactNode> = {
    NOTE: <FileText className="w-4 h-4" />,
    PAGE: <FileText className="w-4 h-4" />,
    COMMENT: <MessageSquare className="w-4 h-4" />,
    USER: <User className="w-4 h-4" />,
};

const reasonLabels: Record<string, string> = {
    SPAM: "Spam",
    INAPPROPRIATE: "Inappropriate Content",
    COPYRIGHT: "Copyright Violation",
    HARASSMENT: "Harassment",
    MISINFORMATION: "Misinformation",
    OTHER: "Other",
};

export function AdminReportsQueue() {
    const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("PENDING");
    const [targetTypeFilter, setTargetTypeFilter] = useState<TargetType | "ALL">("ALL");
    const [expandedReport, setExpandedReport] = useState<string | null>(null);

    const { data, isLoading, refetch } = api.reports.getQueue.useQuery({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        targetType: targetTypeFilter === "ALL" ? undefined : targetTypeFilter,
        limit: 50,
    });

    const { data: stats } = api.reports.getStats.useQuery();

    const updateStatusMutation = api.reports.updateStatus.useMutation({
        onSuccess: () => refetch(),
    });

    const resolveMutation = api.reports.resolve.useMutation({
        onSuccess: () => {
            refetch();
            setExpandedReport(null);
        },
    });

    const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
        await updateStatusMutation.mutateAsync({ id: reportId, status });
    };

    const handleResolve = async (reportId: string, action: string) => {
        const resolution = prompt("Enter resolution notes (optional):");
        await resolveMutation.mutateAsync({
            id: reportId,
            resolution: resolution || action,
            dismiss: false
        });
    };

    const handleDismiss = async (reportId: string) => {
        if (confirm("Are you sure you want to dismiss this report?")) {
            await resolveMutation.mutateAsync({
                id: reportId,
                resolution: "Dismissed - no action needed",
                dismiss: true
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Stats cards */}
            {(stats || data?.counts) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data?.counts?.pending ?? stats?.pending ?? 0}</div>
                                <div className="text-sm text-gray-500">Pending</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data?.counts?.underReview ?? 0}</div>
                                <div className="text-sm text-gray-500">Under Review</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data?.counts?.resolved ?? 0}</div>
                                <div className="text-sm text-gray-500">Resolved</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                                <Flag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                                <div className="text-sm text-gray-500">Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "ALL")}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        >
                            <option value="ALL">All</option>
                            <option value="PENDING">Pending</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="DISMISSED">Dismissed</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Type:</label>
                        <select
                            value={targetTypeFilter}
                            onChange={(e) => setTargetTypeFilter(e.target.value as TargetType | "ALL")}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                        >
                            <option value="ALL">All Types</option>
                            <option value="NOTE">Notes</option>
                            <option value="COMMENT">Comments</option>
                            <option value="USER">Users</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reports list */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Loading reports...</p>
                    </div>
                ) : data?.reports && data.reports.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {data.reports.map((report) => (
                            <div key={report.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                {/* Report summary row */}
                                <div
                                    className="px-6 py-4 cursor-pointer"
                                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Target type icon */}
                                            <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                                                {targetIcons[report.targetType as TargetType]}
                                            </div>

                                            {/* Report info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">
                                                        {reasonLabels[report.reason] || report.reason}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status as ReportStatus]}`}>
                                                        {statusIcons[report.status as ReportStatus]}
                                                        {report.status.replace("_", " ")}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    Reported by {report.reporter?.name || "Unknown"} • {new Date(report.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expand indicator */}
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedReport === report.id ? "rotate-180" : ""}`} />
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {expandedReport === report.id && (
                                    <div className="px-6 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-4 animate-in slide-in-from-top-2 duration-200">
                                        {/* Description */}
                                        {report.description && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium mb-1">Description</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 rounded-lg p-3">
                                                    {report.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Target info */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium mb-1">Reported Content</h4>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500">
                                                    {report.targetType}:
                                                </span>
                                                <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">
                                                    {report.targetId}
                                                </code>
                                                {report.targetType === "NOTE" && (
                                                    <Link
                                                        href={`/notes/${report.targetId}`}
                                                        target="_blank"
                                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        View <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolution (if resolved) */}
                                        {report.resolution && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium mb-1">Resolution</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {report.resolution}
                                                    {report.resolver && (
                                                        <span className="text-gray-400"> — by {report.resolver.name}</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {report.status !== "RESOLVED" && report.status !== "DISMISSED" && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {report.status === "PENDING" && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(report.id, "UNDER_REVIEW")}
                                                        disabled={updateStatusMutation.isPending}
                                                        className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg disabled:opacity-50"
                                                    >
                                                        Take for Review
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleResolve(report.id, "content_removed")}
                                                    disabled={resolveMutation.isPending}
                                                    className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded-lg disabled:opacity-50"
                                                >
                                                    Resolve (Content Removed)
                                                </button>
                                                <button
                                                    onClick={() => handleResolve(report.id, "warning_issued")}
                                                    disabled={resolveMutation.isPending}
                                                    className="px-3 py-1.5 text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg disabled:opacity-50"
                                                >
                                                    Resolve (Warning Issued)
                                                </button>
                                                <button
                                                    onClick={() => handleDismiss(report.id)}
                                                    disabled={resolveMutation.isPending}
                                                    className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400 rounded-lg disabled:opacity-50"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <Flag className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">No Reports</h3>
                        <p className="text-gray-500">
                            {statusFilter === "ALL"
                                ? "No reports have been submitted yet."
                                : `No ${statusFilter.toLowerCase().replace("_", " ")} reports.`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
