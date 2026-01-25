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

    if (!comments || !voteStats) return <div className="p-4 text-gray-600 dark:text-gray-400">Loading interactions...</div>;

    return (
        <div className="w-96 flex flex-col h-[800px] backdrop-blur-xl bg-white/30 dark:bg-black/40 border-l border-white/20 dark:border-white/10 shadow-2xl overflow-hidden rounded-3xl">
            {/* Header */}
            <div className="p-4 border-b border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/20 dark:bg-black/30">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    Page {pageNumber} Discussions
                </h3>
            </div>

            {/* Voting Section */}
            <div className="p-4 border-b border-white/20 dark:border-white/10 flex items-center justify-around backdrop-blur-xl bg-white/10 dark:bg-black/20">
                <div className="flex gap-4">
                    <button
                        onClick={() => handleVote("UP")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl border ${voteStats.userVote === "UP"
                            ? "bg-green-500/20 border-green-400/50 text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20"
                            : "bg-white/30 dark:bg-black/30 border-white/30 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:bg-green-500/10 hover:border-green-400/30"
                            }`}
                    >
                        <ThumbsUp className={`w-5 h-5 ${voteStats.userVote === "UP" ? "fill-current" : ""}`} />
                        <span className="font-medium">{voteStats.up}</span>
                    </button>

                    <button
                        onClick={() => handleVote("DOWN")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl border ${voteStats.userVote === "DOWN"
                            ? "bg-red-500/20 border-red-400/50 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/20"
                            : "bg-white/30 dark:bg-black/30 border-white/30 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:bg-red-500/10 hover:border-red-400/30"
                            }`}
                    >
                        <ThumbsDown className={`w-5 h-5 ${voteStats.userVote === "DOWN" ? "fill-current" : ""}`} />
                        <span className="font-medium">{voteStats.down}</span>
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No comments on this page yet.</p>
                        <p className="text-sm opacity-75">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="backdrop-blur-xl bg-white/40 dark:bg-black/30 p-4 rounded-xl border border-white/30 dark:border-white/15 shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{comment.user.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/20 dark:bg-black/30">
                <form onSubmit={handleComment}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Ask a question or add a note..."
                        className="w-full text-sm p-3 rounded-xl border border-white/30 dark:border-white/15 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/50 focus:outline-none backdrop-blur-xl bg-white/40 dark:bg-black/30 text-gray-800 dark:text-gray-200 placeholder-gray-500 min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-3">
                        <button
                            type="submit"
                            disabled={commentMutation.isPending || !content.trim()}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-200 backdrop-blur-3xl bg-gradient-to-br from-white/40 via-white/20 to-white/30 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-300 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-white/30 dark:border-white/15 hover:border-orange-300/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {commentMutation.isPending ? "Posting..." : "Post Comment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
