"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { X, Flag, Loader2 } from "lucide-react";

type ReportReason = "SPAM" | "INAPPROPRIATE" | "HARMFUL" | "WRONG_SUBJECT" | "LOW_QUALITY" | "DUPLICATE" | "OTHER";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: "note" | "comment" | "request" | "user";
    targetId: string;
    targetTitle?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    { value: "SPAM", label: "Spam", description: "Unwanted promotional content" },
    { value: "INAPPROPRIATE", label: "Inappropriate", description: "Offensive or unsuitable content" },
    { value: "HARMFUL", label: "Harmful", description: "Content that could cause harm" },
    { value: "WRONG_SUBJECT", label: "Wrong Subject", description: "Incorrectly tagged course/subject" },
    { value: "LOW_QUALITY", label: "Low Quality", description: "Poor quality notes" },
    { value: "DUPLICATE", label: "Duplicate", description: "Content already exists" },
    { value: "OTHER", label: "Other", description: "Any other reason" },
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetTitle }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const createReport = api.reports.create.useMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReason) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await createReport.mutateAsync({
                reason: selectedReason,
                description: description.trim() || undefined,
                ...(targetType === "note" && { noteId: targetId }),
                ...(targetType === "comment" && { commentId: targetId }),
                ...(targetType === "request" && { requestId: targetId }),
                ...(targetType === "user" && { reportedUserId: targetId }),
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                // Reset state
                setSelectedReason(null);
                setDescription("");
                setSuccess(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <Flag className="h-5 w-5 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report Content</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {targetTitle && (
                        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Reporting:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {targetTitle}
                            </p>
                        </div>
                    )}

                    {success ? (
                        <div className="py-8 text-center">
                            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <Flag className="h-8 w-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Report Submitted</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Thank you for helping keep our community safe.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                    Why are you reporting this?
                                </label>
                                <div className="space-y-2">
                                    {REPORT_REASONS.map((reason) => (
                                        <label
                                            key={reason.value}
                                            className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedReason === reason.value
                                                    ? "border-red-500 bg-red-500/5"
                                                    : "border-gray-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={reason.value}
                                                checked={selectedReason === reason.value}
                                                onChange={() => setSelectedReason(reason.value)}
                                                className="mt-1 text-red-500 focus:ring-red-500"
                                            />
                                            <div className="ml-3">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {reason.label}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {reason.description}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Additional details (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="Provide any additional context..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-red-500 outline-none transition-all text-gray-900 dark:text-white text-sm resize-none"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {description.length}/500 characters
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedReason || isSubmitting}
                                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Flag className="h-5 w-5" />
                                            Submit Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
