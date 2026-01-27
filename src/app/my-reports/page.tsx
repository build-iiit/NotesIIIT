"use client";

import { api } from "@/app/_trpc/client";
import { Flag, FileText, MessageSquare, FileQuestion, User, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
type ContentType = "note" | "comment" | "request" | "user" | "all";

export default function MyReportsPage() {
    const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
    const [contentFilter, setContentFilter] = useState<ContentType>("all");

    const { data, isLoading } = api.reports.getMyReports.useQuery({
        limit: 50,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-32 flex justify-center bg-white dark:bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    const reports = data?.reports || [];

    // Filter reports
    const filteredReports = reports.filter((report) => {
        const matchesStatus = statusFilter === "all" || report.status === statusFilter;

        let matchesContent = true;
        if (contentFilter !== "all") {
            if (contentFilter === "note") matchesContent = !!report.noteId;
            if (contentFilter === "comment") matchesContent = !!report.commentId;
            if (contentFilter === "request") matchesContent = !!report.requestId;
            if (contentFilter === "user") matchesContent = !!report.reportedUserId;
        }

        return matchesStatus && matchesContent;
    });

    const getContentIcon = (report: any) => {
        if (report.noteId) return <FileText className="w-5 h-5" />;
        if (report.commentId) return <MessageSquare className="w-5 h-5" />;
        if (report.requestId) return <FileQuestion className="w-5 h-5" />;
        if (report.reportedUserId) return <User className="w-5 h-5" />;
        return <Flag className="w-5 h-5" />;
    };

    const getContentType = (report: any) => {
        if (report.noteId) return "Note";
        if (report.commentId) return "Comment";
        if (report.requestId) return "Request";
        if (report.reportedUserId) return "User";
        return "Unknown";
    };

    const getContentTitle = (report: any) => {
        if (report.note) return report.note.title;
        if (report.comment) return report.comment.content.substring(0, 50) + "...";
        if (report.request) return report.request.title;
        if (report.reportedUser) return `User: ${report.reportedUser.name}`;
        return "Unknown content";
    };

    const getContentLink = (report: any) => {
        if (report.noteId) return `/notes/${report.noteId}`;
        if (report.requestId) return `/requests/${report.requestId}`;
        if (report.reportedUserId) return `/users/${report.reportedUserId}`;
        return null;
    };

    const getStatusBadge = (status: ReportStatus) => {
        const configs = {
            PENDING: { color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800", icon: Clock },
            REVIEWED: { color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", icon: Eye },
            RESOLVED: { color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800", icon: CheckCircle2 },
            DISMISSED: { color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800", icon: XCircle },
        };

        const config = configs[status];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 max-w-6xl mx-auto bg-white dark:bg-black">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">My Reports</h1>
                <p className="text-gray-600 dark:text-gray-400">Track the status of your submitted reports</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
                {/* Status Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="DISMISSED">Dismissed</option>
                    </select>
                </div>

                {/* Content Type Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Content Type</label>
                    <select
                        value={contentFilter}
                        onChange={(e) => setContentFilter(e.target.value as ContentType)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                        <option value="all">All Types</option>
                        <option value="note">Notes</option>
                        <option value="comment">Comments</option>
                        <option value="request">Requests</option>
                        <option value="user">Users</option>
                    </select>
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {filteredReports.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No reports found</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {statusFilter !== "all" || contentFilter !== "all"
                                ? "Try adjusting your filters"
                                : "You haven't submitted any reports yet"}
                        </p>
                    </div>
                ) : (
                    filteredReports.map((report) => {
                        const contentLink = getContentLink(report);

                        return (
                            <div
                                key={report.id}
                                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Content Info */}
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="p-3 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 flex-shrink-0">
                                            {getContentIcon(report)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    {getContentType(report)}
                                                </span>
                                                {getStatusBadge(report.status)}
                                            </div>

                                            {contentLink ? (
                                                <Link
                                                    href={contentLink}
                                                    className="text-lg font-bold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2"
                                                >
                                                    {getContentTitle(report)}
                                                </Link>
                                            ) : (
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                                                    {getContentTitle(report)}
                                                </h3>
                                            )}

                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Reason:</span>
                                                    <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        {report.reason.replace("_", " ")}
                                                    </span>
                                                </div>

                                                {report.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                        {report.description}
                                                    </p>
                                                )}

                                                <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Reported {new Date(report.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Stats Summary */}
            {reports.length > 0 && (
                <div className="mt-8 p-6 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{reports.length}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total Reports</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                {reports.filter(r => r.status === "PENDING").length}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">
                                {reports.filter(r => r.status === "RESOLVED").length}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Resolved</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-600 dark:text-gray-400">
                                {reports.filter(r => r.status === "DISMISSED").length}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Dismissed</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
