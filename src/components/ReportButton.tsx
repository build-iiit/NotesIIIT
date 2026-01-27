"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";

interface ReportButtonProps {
    targetType: "note" | "comment" | "request" | "user";
    targetId: string;
    targetTitle?: string;
    variant?: "icon" | "button";
    className?: string;
}

export function ReportButton({ targetType, targetId, targetTitle, variant = "icon", className = "" }: ReportButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (variant === "button") {
        return (
            <>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ${className}`}
                >
                    <Flag className="h-4 w-4" />
                    Report
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
                onClick={() => setIsModalOpen(true)}
                className={`p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ${className}`}
                title="Report"
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
