"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Flag, Eye, CheckCircle, X, Loader2, AlertTriangle, FileText, MessageSquare, HelpCircle, User } from "lucide-react";

export function AdminReportsTable() {
    const [statusFilter, setStatusFilter] = useState<"PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED" | undefined>(undefined);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [action, setAction] = useState<"REMOVE_CONTENT" | "WARN_USER" | "BAN_USER" | "DISMISS" | null>(null);
    const [resolution, setResolution] = useState("");

    const { data, isLoading, refetch } = api.admin.getReports.useQuery({ status: statusFilter });
    const { data: stats } = api.admin.getReportStats.useQuery();
    const resolveReport = api.admin.resolveReport.useMutation();
    const dismissReport = api.admin.dismissReport.useMutation();

    const handleResolve = async () => {
        if (!selectedReport || !action) return;

        try {
            if (action === "DISMISS") {
                await dismissReport.mutateAsync({
                    reportId: selectedReport.id,
                    reason: resolution || undefined,
                });
            } else {
                await resolveReport.mutateAsync({
                    reportId: selectedReport.id,
                    action,
                    resolution: resolution || undefined,
                });
            }

            setSelectedReport(null);
            setAction(null);
            setResolution("");
            refetch();
        } catch (error) {
            console.error("Failed to resolve report:", error);
            alert("Failed to resolve report");
        }
    };

    const getTargetInfo = (report: any) => {
        if (report.note) {
            return {
                type: "Note",
                icon: <FileText className="h-4 w-4" />,
                title: report.note.title,
                author: report.note.author?.name,
            };
        }
        if (report.comment) {
            return {
                type: "Comment",
                icon: <MessageSquare className="h-4 w-4" />,
                title: report.comment.content.substring(0, 50) + "...",
                author: report.comment.user?.name,
            };
        }
        if (report.request) {
            return {
                type: "Request",
                icon: <HelpCircle className="h-4 w-4" />,
                title: report.request.title,
                author: report.request.user?.name,
            };
        }
        if (report.reportedUser) {
            return {
                type: "User",
                icon: <User className="h-4 w-4" />,
                title: report.reportedUser.name || report.reportedUser.email,
                author: null,
            };
        }
        return { type: "Unknown", icon: null, title: "N/A", author: null };
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            REVIEWED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            RESOLVED: "bg-green-500/10 text-green-600 dark:text-green-400",
            DISMISSED: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status as keyof typeof styles]}`}>
                {status}
            </span>
        );
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            SPAM: "Spam",
            INAPPROPRIATE: "Inappropriate",
            HARMFUL: "Harmful",
            WRONG_SUBJECT: "Wrong Subject",
            LOW_QUALITY: "Low Quality",
            DUPLICATE: "Duplicate",
            OTHER: "Other",
        };
        return labels[reason] || reason;
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
                    </div>
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <p className="text-sm text-blue-600 dark:text-blue-400">Reviewed</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.reviewed}</p>
                    </div>
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <p className="text-sm text-green-600 dark:text-green-400">Resolved</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.resolved}</p>
                    </div>
                    <div className="bg-gray-500/10 p-4 rounded-xl border border-gray-500/20">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dismissed</p>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.dismissed}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setStatusFilter(undefined)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!statusFilter
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setStatusFilter("PENDING")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "PENDING"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                >
                    Pending
                </button>
                <button
                    onClick={() => setStatusFilter("RESOLVED")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "RESOLVED"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                >
                    Resolved
                </button>
                <button
                    onClick={() => setStatusFilter("DISMISSED")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === "DISMISSED"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                >
                    Dismissed
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    </div>
                ) : !data?.reports.length ? (
                    <div className="p-8 text-center text-gray-500">No reports found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Content
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Reason
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Reporter
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                {data.reports.map((report: any) => {
                                    const target = getTargetInfo(report);
                                    return (
                                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {target.icon}
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {target.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                                                    {target.title}
                                                </p>
                                                {target.author && (
                                                    <p className="text-xs text-gray-500">by {target.author}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {getReasonLabel(report.reason)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {report.reporter.name || report.reporter.email}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-500">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => setSelectedReport(report)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report Details</h2>
                                <button
                                    onClick={() => {
                                        setSelectedReport(null);
                                        setAction(null);
                                        setResolution("");
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reason</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {getReasonLabel(selectedReport.reason)}
                                </p>
                            </div>

                            {selectedReport.description && (
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Details</p>
                                    <p className="text-sm text-gray-900 dark:text-white">{selectedReport.description}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reporter</p>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {selectedReport.reporter.name || selectedReport.reporter.email}
                                </p>
                            </div>

                            {selectedReport.status === "PENDING" && (
                                <>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Action</p>
                                        <div className="space-y-2">
                                            {[
                                                { value: "DISMISS", label: "Dismiss Report", color: "gray" },
                                                { value: "WARN_USER", label: "Warn User", color: "yellow" },
                                                { value: "REMOVE_CONTENT", label: "Remove Content", color: "orange" },
                                                { value: "BAN_USER", label: "Ban User", color: "red" },
                                            ].map((opt) => (
                                                <label
                                                    key={opt.value}
                                                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${action === opt.value
                                                        ? `border-${opt.color}-500 bg-${opt.color}-500/5`
                                                        : "border-gray-200 dark:border-zinc-700"
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="action"
                                                        value={opt.value}
                                                        checked={action === opt.value}
                                                        onChange={() => setAction(opt.value as any)}
                                                        className="text-orange-500"
                                                    />
                                                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {opt.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Resolution Notes
                                        </label>
                                        <textarea
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-orange-500 outline-none text-sm text-gray-900 dark:text-white"
                                            placeholder="Add notes about your decision..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleResolve}
                                        disabled={!action || resolveReport.isPending || dismissReport.isPending}
                                        className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {resolveReport.isPending || dismissReport.isPending ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Processing...
                                            </div>
                                        ) : (
                                            "Submit Decision"
                                        )}
                                    </button>
                                </>
                            )}

                            {selectedReport.status !== "PENDING" && selectedReport.resolution && (
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Resolution</p>
                                    <p className="text-sm text-gray-900 dark:text-white">{selectedReport.resolution}</p>
                                    {selectedReport.resolvedBy && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Resolved by {selectedReport.resolvedBy.name} on{" "}
                                            {new Date(selectedReport.resolvedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
