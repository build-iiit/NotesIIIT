"use client";

import { Suspense } from "react";
import { UploadForm } from "@/components/UploadForm";
import { useSearchParams } from "next/navigation";

function UploadContent() {
    const searchParams = useSearchParams();
    const initialFolderId = searchParams?.get("folderId") || null;

    return (
        <div className="min-h-screen py-12 px-4 relative overflow-hidden pt-24">
            <UploadForm initialFolderId={initialFolderId} />
        </div>
    );
}

export default function UploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        }>
            <UploadContent />
        </Suspense>
    );
}
