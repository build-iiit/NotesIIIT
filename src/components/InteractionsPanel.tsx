"use client";

import { api } from "@/app/_trpc/client";
import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Sparkles } from "lucide-react";
import { ApiKeyDialog } from "./ApiKeyDialog";

interface InteractionsPanelProps {
    versionId: string;
    pageNumber: number;
    getPageImage?: () => string | null;
}

export function InteractionsPanel({ versionId, pageNumber, getPageImage }: InteractionsPanelProps) {
    const [activeTab, setActiveTab] = useState<"COMMENTS" | "AI">("COMMENTS");
    const [content, setContent] = useState("");
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiAnswer, setAiAnswer] = useState("");
    const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const utils = api.useUtils();

    // Fetch available models
    const { data: availableModels } = api.ai.getAvailableModels.useQuery(undefined, {
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
        retry: false
    });

    // Update selected model if current one is not in the list (once list is loaded)
    // Preference: 2.0-flash -> 2.5-flash -> 1.5-flash -> first available
    useEffect(() => {
        if (availableModels && availableModels.length > 0) {
            const hasCurrent = availableModels.some((m: { id: string }) => m.id === selectedModel);
            if (!hasCurrent) {
                const preference = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
                const bestMatch = preference.find(p => availableModels.some((m: { id: string }) => m.id === p));
                setSelectedModel(bestMatch || availableModels[0].id);
            }
        }
    }, [availableModels]);

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

    const aiMutation = api.ai.askDocumentWithImage.useMutation({
        onSuccess: (data) => {
            setAiAnswer(data.answer);
            setAiQuestion(""); // Clear input after successful query
        },
        onError: (error) => {
            // Check if error is due to missing API key
            if (error.message === "API_KEY_REQUIRED") {
                setShowApiKeyDialog(true);
            } else if (error.message?.includes("RATE_LIMIT_EXCEEDED")) {
                // Show rate limit error as answer with fallback suggestion
                setAiAnswer(`⏱️ Rate limit reached for ${selectedModel.replace("models/", "")}!\n\nThe free tier has request limits. Try switching models:\n\n1. Select a different model from the dropdown above\n2. Wait about 30 seconds and try again`);
            } else {
                // Show generic error
                setAiAnswer("❌ " + (error.message || "Something went wrong. Please try again."));
            }
        }
    });

    const handleVote = (type: "UP" | "DOWN") => {
        voteMutation.mutate({ versionId, pageNumber, type });
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        commentMutation.mutate({ versionId, pageNumber, content });
    };

    const handleAskAi = (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiQuestion.trim()) return;

        // Capture current page image
        const imageBase64 = getPageImage?.();
        if (!imageBase64) {
            setAiAnswer("Unable to capture page image. Please try again.");
            return;
        }

        aiMutation.mutate({
            versionId,
            question: aiQuestion,
            pageNumber,
            imageBase64,
            model: selectedModel
        });
    };

    if (!comments || !voteStats) return <div className="p-4 text-gray-600 dark:text-gray-400">Loading interactions...</div>;

    return (
        <>
            {showApiKeyDialog && (
                <ApiKeyDialog
                    onClose={() => setShowApiKeyDialog(false)}
                    onSave={() => {
                        // Retry the AI query after saving the key
                        if (aiQuestion.trim() && getPageImage) {
                            const imageBase64 = getPageImage();
                            if (imageBase64) {
                                aiMutation.mutate({ versionId, question: aiQuestion, pageNumber, imageBase64, model: selectedModel });
                            }
                        }
                    }}
                />
            )}

            <div className="w-96 flex flex-col h-[800px] backdrop-blur-xl bg-white/30 dark:bg-black/40 border-l border-white/20 dark:border-white/10 shadow-2xl overflow-hidden rounded-3xl transition-all duration-300">
                {/* Header & Tabs */}
                <div className="flex flex-col border-b border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/20 dark:bg-black/30">
                    <div className="p-4 pb-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            Page {pageNumber} Insights
                        </h3>
                    </div>
                    <div className="flex p-1 mx-4 mb-4 backdrop-blur-md bg-black/5 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/10 relative">
                        {/* Animated background sliding pill */}
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-white/10 shadow-sm transition-all duration-300 ease-in-out ${activeTab === "AI" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"
                                }`}
                        />

                        <button
                            onClick={() => setActiveTab("COMMENTS")}
                            className={`flex-1 relative z-10 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 ${activeTab === "COMMENTS"
                                ? "text-gray-800 dark:text-gray-100"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            Discussions
                        </button>
                        <button
                            onClick={() => setActiveTab("AI")}
                            className={`flex-1 relative z-10 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 ${activeTab === "AI"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Ask AI
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto flex flex-col relative">
                    {activeTab === "COMMENTS" ? (
                        <>
                            {/* Voting Section */}
                            <div className="p-4 border-b border-white/20 dark:border-white/10 flex items-center justify-around bg-white/5 dark:bg-black/10">
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
                            <div className="flex-1 p-4 space-y-3">
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
                        </>
                    ) : (
                        // AI Tab
                        <div className="flex flex-col h-full">
                            {/* Page context info & Model Selector */}
                            <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/10 space-y-3">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20">
                                    <Sparkles className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        Analyzing page {pageNumber}
                                    </span>
                                </div>

                                {/* Model Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Model:</span>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/10 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500/50"
                                        disabled={!availableModels}
                                    >
                                        {availableModels ? (
                                            availableModels.map((model: { id: string; displayName: string }) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.displayName}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="gemini-2.0-flash">Loading models...</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                {!aiAnswer ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                                            <Sparkles className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <p className="font-medium text-lg mb-1">Ask Gemini AI</p>
                                        <p className="text-sm opacity-75 max-w-[200px] mx-auto">Get summaries, explanations, or ask questions about what you see on this page.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-start">
                                            <div className="space-y-2 max-w-[95%]">
                                                <div className="bg-white/40 dark:bg-white/5 border border-white/20 px-4 py-3 rounded-2xl rounded-tl-sm backdrop-blur-md text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                    {aiAnswer}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Input */}
                            <div className="p-4 border-t border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/20 dark:bg-black/30">
                                <form onSubmit={handleAskAi}>
                                    <textarea
                                        value={aiQuestion}
                                        onChange={(e) => setAiQuestion(e.target.value)}
                                        placeholder="Ask about this document..."
                                        className="w-full text-sm p-3 rounded-xl border border-blue-200/30 dark:border-blue-500/15 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/50 focus:outline-none backdrop-blur-xl bg-white/40 dark:bg-black/30 text-gray-800 dark:text-gray-200 placeholder-gray-500 min-h-[80px] resize-none"
                                    />
                                    <div className="flex justify-end mt-3">
                                        <button
                                            type="submit"
                                            disabled={aiMutation.isPending || !aiQuestion.trim()}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white backdrop-blur-3xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-blue-500/20 border border-white/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                                        >
                                            {aiMutation.isPending ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Thinking...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    Ask Gemini
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
