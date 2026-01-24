"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

interface InteractionsPanelProps {
    versionId: string;
    pageNumber: number;
}

export function InteractionsPanel({ versionId, pageNumber }: InteractionsPanelProps) {
    const [content, setContent] = useState("");
    const utils = api.useUtils();

    // Fetch comments
    const { data: comments } = api.comments.getByPage.useQuery({
        versionId,
        pageNumber,
    });

    // Fetch votes stats
    const { data: voteStats } = api.votes.getStats.useQuery({
        versionId,
        pageNumber,
    });

    const voteMutation = api.votes.vote.useMutation({
        onMutate: async () => {
            await utils.votes.getStats.cancel({ versionId, pageNumber });
            // Optimistic update logic omitted for brevity, but recommended
        },
        onSettled: () => {
            utils.votes.getStats.invalidate({ versionId, pageNumber });
        },
    });

    const commentMutation = api.comments.create.useMutation({
        onSuccess: () => {
            setContent("");
            utils.comments.getByPage.invalidate({ versionId, pageNumber });
        },
    });

    const handleVote = (type: "UP" | "DOWN") => {
        voteMutation.mutate({ versionId, pageNumber, type });
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        commentMutation.mutate({ versionId, pageNumber, content });
    };

    if (!comments || !voteStats) return <div className="p-4">Loading interactions...</div>;

    return (
        <div className="w-96 flex flex-col h-[800px] border-l bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
            <div className="p-4 border-b bg-gray-50 dark:bg-zinc-800">
                <h3 className="font-bold flex items-center gap-2">
                    Page {pageNumber} Discussions
                </h3>
            </div>

            <div className="p-4 border-b flex items-center justify-around bg-white dark:bg-zinc-900">
                <div className="flex gap-4">
                    <button
                        onClick={() => handleVote("UP")}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors ${voteStats.userVote === "UP" ? "text-green-600 bg-green-50" : "text-gray-500"
                            }`}
                    >
                        <ThumbsUp className={`w-5 h-5 ${voteStats.userVote === "UP" ? "fill-current" : ""}`} />
                        <span className="font-medium">{voteStats.up}</span>
                    </button>

                    <button
                        onClick={() => handleVote("DOWN")}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${voteStats.userVote === "DOWN" ? "text-red-600 bg-red-50" : "text-gray-500"
                            }`}
                    >
                        <ThumbsDown className={`w-5 h-5 ${voteStats.userVote === "DOWN" ? "fill-current" : ""}`} />
                        <span className="font-medium">{voteStats.down}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No comments on this page yet.</p>
                        <p className="text-sm">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm">{comment.user.name}</span>
                                <span className="text-xs text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-zinc-800">
                <form onSubmit={handleComment}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Ask a question or add a note..."
                        className="w-full text-sm p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-900 min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={commentMutation.isPending || !content.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {commentMutation.isPending ? "Posting..." : "Post Comment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
