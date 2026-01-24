"use client";

import { use, useState } from "react";
import { api } from "@/app/_trpc/client";
import { PdfViewer } from "@/components/PdfViewer";
import { InteractionsPanel } from "@/components/InteractionsPanel";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const [pageNum, setPageNum] = useState(1);

    if (!note) return <div>Note not found</div>;

    // Find current version
    const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];
    const s3Url = note.fileUrl;

    return (
        <div className="min-h-screen p-8 flex flex-col items-center">
            <div className="w-full max-w-7xl">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <a href="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Home</a>
                        <h1 className="text-3xl font-bold">{note.title}</h1>
                        <p className="text-gray-500">
                            By {note.author.name} • Version {currentVersion?.version}
                        </p>
                        {note.description && <p className="mt-2 text-lg">{note.description}</p>}
                    </div>
                    <div className="flex gap-4">
                        {/* Implemented Edit Link */}
                        <a href={`/notes/${note.id}/edit`} className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                            Edit Note
                        </a>
                    </div>
                </div>

                <div className="flex gap-8 items-start">
                    <div className="flex-1">
                        {s3Url ? (
                            <PdfViewer
                                url={s3Url}
                                pageNum={pageNum}
                                onPageChange={setPageNum}
                            />
                        ) : (
                            <div className="p-8 border text-center text-red-500">
                                Could not load PDF version.
                            </div>
                        )}
                    </div>

                    {currentVersion && (
                        <div className="shrink-0">
                            <InteractionsPanel
                                versionId={currentVersion.id}
                                pageNumber={pageNum}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
