"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2 } from "lucide-react";
import { UploadForm } from "@/components/UploadForm";

interface FulfillRequestModalProps {
    requestId: string;
    trigger: React.ReactNode;
}

export function FulfillRequestModal({ requestId, trigger }: FulfillRequestModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"existing" | "upload">("existing");
    const router = useRouter();

    // --- Tab 1: Select Existing ---
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const { data: myNotes, isLoading: isLoadingNotes } = api.notes.getAll.useQuery(
        { limit: 50 },
        { enabled: isOpen && activeTab === "existing" }
    );

    const fulfillMutation = api.requests.fulfill.useMutation({
        onSuccess: () => {
            setIsOpen(false);
            router.refresh();
        },
        onError: (err) => {
            alert(err.message || "Failed to fulfill request");
        }
    });

    const handleFulfillExisting = () => {
        if (!selectedNoteId) return;
        fulfillMutation.mutate({ requestId, noteId: selectedNoteId });
    };

    const handleUploadSuccess = (note: any) => {
        // Note created successfully, now link it
        fulfillMutation.mutate({ requestId, noteId: note.id });
    };

    if (!isOpen) {
        return <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>{trigger}</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-pink-600">
                        Fulfill Request
                    </h2>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab("existing")}
                        className={cn("flex-1 py-4 text-sm font-medium border-b-2 transition-colors", activeTab === "existing" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}
                    >
                        Select Existing Note
                    </button>
                    <button
                        onClick={() => setActiveTab("upload")}
                        className={cn("flex-1 py-4 text-sm font-medium border-b-2 transition-colors", activeTab === "upload" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}
                    >
                        Upload New Note
                    </button>
                </div>

                <div className="p-0 flex-1 overflow-y-auto bg-gray-50/50 dark:bg-zinc-900/50">
                    {/* EXISTNG NOTES TAB */}
                    {activeTab === "existing" && (
                        <div className="p-6 space-y-4">
                            {isLoadingNotes ? (
                                <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" /></div>
                            ) : myNotes?.items.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    You haven't uploaded any notes yet.
                                    <button onClick={() => setActiveTab("upload")} className="block mx-auto mt-2 text-orange-600 font-medium hover:underline">Upload one now</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {myNotes?.items.map(note => (
                                        <div
                                            key={note.id}
                                            onClick={() => setSelectedNoteId(note.id)}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 bg-white dark:bg-zinc-800/50",
                                                selectedNoteId === note.id
                                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 ring-1 ring-orange-500"
                                                    : "border-gray-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", selectedNoteId === note.id ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                                                {selectedNoteId === note.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{note.title}</p>
                                                <p className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* UPLOAD NEW TAB */}
                    {activeTab === "upload" && (
                        <div className="p-6">
                            <UploadForm onSuccess={handleUploadSuccess} isFulfillmentMode={true} />
                        </div>
                    )}
                </div>

                {activeTab === "existing" && (
                    <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFulfillExisting}
                            disabled={!selectedNoteId || fulfillMutation.isPending}
                            className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {fulfillMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Link Selected Note
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
