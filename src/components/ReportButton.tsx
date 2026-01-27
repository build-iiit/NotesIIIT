"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";
import { api } from "@/app/_trpc/client";

interface ReportButtonProps {
    targetType: "note" | "comment" | "request" | "user";
    targetId: string;
    targetTitle?: string;
    variant?: "icon" | "button";
    className?: string;
}

export function ReportButton({ targetType, targetId, targetTitle, variant = "icon", className = "" }: ReportButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Check if user has already reported this content
    const { data: reportCheck } = api.reports.checkIfReported.useQuery(
        {
            ...(targetType === "note" && { noteId: targetId }),
            ...(targetType === "comment" && { commentId: targetId }),
            ...(targetType === "request" && { requestId: targetId }),
            ...(targetType === "user" && { reportedUserId: targetId }),
        },
        {
            enabled: !!targetId,
        }
    );

    const hasReported = reportCheck?.hasReported ?? false;

    if (variant === "button") {
        return (
            <>
                <button
                    onClick={() => !hasReported && setIsModalOpen(true)}
                    disabled={hasReported}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${hasReported
                        ? "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-zinc-800 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10"
                        } ${className}`}
                    title={hasReported ? "Already reported" : "Report this content"}
                >
                    <Flag className="h-4 w-4" />
                    {hasReported ? "Already Reported" : "Report"}
                </button>
                <ReportModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    targetType={targetType}
                    targetId={targetId}
                    targetTitle={targetTitle}
                />
            </>
        );
    }

    return (
        <>
            <button
                onClick={() => !hasReported && setIsModalOpen(true)}
                disabled={hasReported}
                className={`p-2 rounded-lg transition-colors ${hasReported
                    ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                    } ${className}`}
                title={hasReported ? "Already reported" : "Report this content"}
            >
                <Flag className="h-4 w-4" />
            </button>
            <ReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                targetType={targetType}
                targetId={targetId}
                targetTitle={targetTitle}
            />
        </>
    );
}
