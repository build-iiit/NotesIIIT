"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Flag, X, AlertTriangle, CheckCircle } from "lucide-react";

interface ReportButtonProps {
    noteId: string;
    isAuthor?: boolean;
}

type ReportType = "SPAM" | "INAPPROPRIATE" | "COPYRIGHT" | "HARASSMENT" | "MISINFORMATION" | "OTHER";

const reportTypes: { value: ReportType; label: string }[] = [
    { value: "SPAM", label: "Spam or misleading" },
    { value: "INAPPROPRIATE", label: "Inappropriate content" },
    { value: "COPYRIGHT", label: "Copyright violation" },
    { value: "HARASSMENT", label: "Harassment or bullying" },
    { value: "MISINFORMATION", label: "Misinformation" },
    { value: "OTHER", label: "Other" },
];

export function ReportButton({ noteId, isAuthor }: ReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reportType, setReportType] = useState<ReportType>("SPAM");
    const [reason, setReason] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const reportMutation = api.reports.create.useMutation({
        onSuccess: () => {
            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setReason("");
                setReportType("SPAM");
            }, 2000);
        },
    });

    // Don't show to the note author
    if (isAuthor) return null;

    const handleSubmit = () => {
        reportMutation.mutate({
            targetType: "NOTE",
            targetId: noteId,
            reason: reportType,
            description: reason.trim() || undefined,
        });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Report this note"
            >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
            </button>

            {/* Report Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => !reportMutation.isPending && setIsOpen(false)}
                    />

                    <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6">
                        <button
                            onClick={() => setIsOpen(false)}
                            disabled={reportMutation.isPending}
                            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {submitted ? (
                            <div className="text-center py-6">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Report Submitted</h3>
                                <p className="text-sm text-gray-500">
                                    Thank you for helping keep our community safe. We&apos;ll review your report.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Report Content</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Why are you reporting this?
                                        </label>
                                        <select
                                            value={reportType}
                                            onChange={(e) => setReportType(e.target.value as ReportType)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            {reportTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Additional details
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Please describe the issue..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        />
                                    </div>

                                    {reportMutation.error && (
                                        <p className="text-sm text-red-500">
                                            {reportMutation.error.message || "Failed to submit report"}
                                        </p>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            disabled={reportMutation.isPending}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={reportMutation.isPending || !reason.trim()}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
