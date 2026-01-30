"use client";

import { api } from "@/app/_trpc/client";
import { ArrowBigUp, Calendar, CheckCircle2, MessageSquare, Tag, User, Clock, Trash2, MoreVertical, Heart, Reply, X, ChevronLeft, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ProfileImage } from "@/components/ProfileImage";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FulfillRequestModal } from "@/components/requests/FulfillRequestModal";
import { useSession } from "next-auth/react";
import { toast } from "sonner";


export default function RequestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const requestId = params?.requestId as string;

    const { data: request, isLoading, refetch } = api.requests.getById.useQuery(
        { id: requestId },
        { enabled: !!requestId }
    );

    // Request Mutations
    const toggleUpvote = api.requests.toggleUpvote.useMutation({ onSuccess: () => refetch() });

    const deleteRequest = api.requests.delete.useMutation({
        onSuccess: () => {
            toast.success("Request deleted");
            router.push("/requests");
        },
        onError: (err) => toast.error(err.message)
    });

    const markFulfilled = api.requests.markFulfilled.useMutation({
        onSuccess: () => {
            toast.success("Marked as fulfilled");
            refetch();
        }
    });

    // Comment State
    const [commentContent, setCommentContent] = useState("");
    const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

    const addComment = api.requests.addComment.useMutation({
        onSuccess: () => {
            setCommentContent("");
            setReplyTo(null);
            refetch();
            toast.success("Comment posted");
        }
    });

    const toggleCommentUpvote = api.requests.toggleCommentUpvote.useMutation({
        onSuccess: () => refetch()
    });

    if (isLoading) return (
        <div className="min-h-screen pt-32 flex justify-center bg-neutral-50 dark:bg-black">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
    );

    if (!request) return (
        <div className="min-h-screen pt-32 text-center bg-neutral-50 dark:bg-black">
            <h1 className="text-2xl font-bold">Request not found</h1>
            <Link href="/requests" className="text-orange-600 hover:underline">Go back to board</Link>
        </div>
    );

    const isAuthor = session?.user?.id === request.user.id;
    const isAdmin = session?.user?.role === "ADMIN";
    const canManage = isAuthor || isAdmin;

    // Comment Threading Helper
    const CommentItem = ({ comment, depth = 0 }: { comment: any, depth?: number }) => {
        const isChild = depth > 0;
        return (
            <div
                className={cn("group relative", isChild ? "mt-4 pl-4 md:pl-8" : "mt-8")}
            >
                {/* Visual Thread Line for Children */}
                {isChild && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-zinc-800 dark:via-zinc-800" />
                )}

                <div className="flex items-start gap-4">
                    <ProfileImage src={comment.user.image} width={36} height={36} className="rounded-full w-9 h-9 mt-1 border border-white dark:border-zinc-800 shadow-sm" />

                    <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-all hover:border-gray-300 dark:hover:border-white/10 hover:shadow-md">
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="font-bold text-sm text-gray-900 dark:text-white mr-2">{comment.user.name}</span>
                                <span className="text-xs text-gray-400 font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>

                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                        </div>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-4 mt-2 ml-2">
                            <button
                                onClick={() => toggleCommentUpvote.mutate({ commentId: comment.id })}
                                className={cn("text-xs font-bold flex items-center gap-1.5 px-2 py-1 rounded-full transition-all",
                                    comment.isUpvoted
                                        ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20"
                                        : "text-gray-500 hover:text-pink-500 hover:bg-gray-100 dark:hover:bg-white/5"
                                )}
                            >
                                <Heart className={cn("w-3.5 h-3.5", comment.isUpvoted && "fill-current")} />
                                {comment._count?.upvotes || 0}
                            </button>

                            <button
                                onClick={() => {
                                    setReplyTo({ id: comment.id, name: comment.user.name || "User" });
                                    document.getElementById("comment-box")?.focus();
                                }}
                                className="text-xs font-bold text-gray-500 hover:text-orange-600 flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                            >
                                <Reply className="w-3.5 h-3.5" /> Reply
                            </button>
                        </div>
                    </div>
                </div>

                {/* Render Children */}
                {comment.children?.map((child: any) => (
                    <CommentItem key={child.id} comment={child} depth={depth + 1} />
                ))}
            </div>
        );
    };

    // Client-side tree construction with upvote sorting
    const buildCommentTree = (comments: any[]) => {
        const map = new Map();
        const roots: any[] = [];
        // Deep clone to avoid mutating read-only props if any
        const nodes = comments.map(c => ({ ...c, children: [] }));
        nodes.forEach(node => map.set(node.id, node));
        nodes.forEach(node => {
            if (node.parentId && map.has(node.parentId)) {
                map.get(node.parentId).children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort function: by upvotes descending
        const sortByUpvotes = (a: any, b: any) =>
            (b._count?.upvotes || 0) - (a._count?.upvotes || 0);

        // Recursively sort children at each level
        const sortChildren = (nodes: any[]) => {
            nodes.sort(sortByUpvotes);
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortChildren(node.children);
                }
            });
        };

        sortChildren(roots);
        return roots;
    };

    const rootComments = buildCommentTree(request.comments);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black selection:bg-orange-500/30 pb-20">
            {/* Fixed Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/05 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/05 blur-[120px]" />
            </div>

            <div className="relative z-10 pt-24 px-4 max-w-7xl mx-auto">
                {/* Header / Nav */}
                <div className="mb-8 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-white/5 sticky top-20 z-40 shadow-sm">
                    <Link
                        href="/requests"
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors group"
                    >
                        <div className="p-2 rounded-full bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 group-hover:scale-105 transition-transform">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                        Back to Board
                    </Link>

                    <div className="flex gap-2">
                        {canManage && (
                            <>
                                {request.status !== "FULFILLED" && (
                                    <button
                                        onClick={() => markFulfilled.mutate({ requestId: request.id })}
                                        className="text-xs font-bold text-green-600 border border-green-200 bg-green-50 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors shadow-sm"
                                    >
                                        Mark Complete
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this request?")) deleteRequest.mutate({ requestId: request.id });
                                    }}
                                    className="text-xs font-bold text-red-600 border border-red-200 bg-red-50/50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </>
                        )}
                        <button className="p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors" title="Share">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Details & Discussion (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Main Request Card */}
                        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-none relative overflow-hidden group">
                            {/* Hover Gradient Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="flex gap-6 md:gap-8 relative z-10">
                                {/* Vote Column */}
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={() => toggleUpvote.mutate({ requestId: request.id })}
                                        className={cn(
                                            "flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all duration-300 border shadow-sm active:scale-95 group/vote",
                                            request.isUpvoted
                                                ? "bg-gradient-to-b from-orange-50 to-orange-100 border-orange-200 text-orange-600 dark:from-orange-950/30 dark:to-orange-900/30 dark:border-orange-500/30 dark:text-orange-400"
                                                : "bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 dark:bg-black/40 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-orange-400"
                                        )}
                                    >
                                        <ArrowBigUp className={cn("w-8 h-8 transition-all duration-300", request.isUpvoted ? "scale-110 fill-orange-500 drop-shadow-sm" : "group-hover/vote:-translate-y-0.5")} strokeWidth={1.5} />
                                    </button>
                                    <span className="font-black text-2xl text-gray-900 dark:text-white tracking-tight">{request._count.upvotes}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-[1.1] mb-5">
                                            {request.title}
                                        </h1>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm transition-transform hover:scale-105">
                                                <ProfileImage src={request.user.image} width={20} height={20} className="rounded-full w-5 h-5" />
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">{request.user.name}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{new Date(request.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                            </div>
                                            {request.status === "FULFILLED" && (
                                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold uppercase text-[10px] tracking-wider border border-green-200 dark:border-green-800/50">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Fulfilled
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                                        <p className="whitespace-pre-wrap">{request.description}</p>
                                    </div>

                                    {request.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                                            {request.tags.map(tag => (
                                                <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 cursor-default">
                                                    <Tag className="w-3.5 h-3.5 opacity-50" /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Discussion Section */}
                        <div className="pt-2">
                            <div className="flex items-center gap-3 mb-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-gray-400" />
                                    Discussion
                                </h3>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
                                <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-600 dark:text-gray-400">
                                    {request.comments.length} comments
                                </span>
                            </div>

                            {/* Comment Input */}
                            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-1 mb-10 shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-white/5 scroll-mt-24 ring-4 ring-gray-50 dark:ring-white/5" id="comment-box">
                                {replyTo && (
                                    <div className="flex items-center justify-between mx-3 mt-3 mb-1 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-xl animate-in slide-in-from-top-2">
                                        <span>Replying to {replyTo.name}</span>
                                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        placeholder={replyTo ? `Write a reply to ${replyTo.name}...` : "Start a discussion or ask for details..."}
                                        className="w-full px-6 py-4 rounded-3xl bg-transparent border-none outline-none focus:ring-0 min-h-[120px] resize-y text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                                    />
                                    <div className="flex justify-between items-center px-4 pb-4">
                                        <div className="text-xs text-gray-400 pl-2">Markdown supported</div>
                                        <button
                                            onClick={() => addComment.mutate({ requestId: request.id, content: commentContent, parentId: replyTo?.id })}
                                            disabled={!commentContent.trim() || addComment.isPending}
                                            className="px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 shadow-lg shadow-black/20 dark:shadow-white/20"
                                        >
                                            {addComment.isPending && <div className="w-4 h-4 border-2 border-white/50 border-t-white dark:border-black/50 dark:border-t-black rounded-full animate-spin" />}
                                            {replyTo ? "Reply" : "Post Comment"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Comments Stream */}
                            <div className="space-y-2">
                                {rootComments.map(comment => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))}
                                {rootComments.length === 0 && (
                                    <div className="text-center py-16 px-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No discussion yet.</p>
                                        <p className="text-sm text-gray-400">Be the first to join the conversation!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fulfillment & Answers (4 cols) */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">

                        {/* CTA Card */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-pink-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-orange-500/30 group">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors duration-700" />
                            <div className="absolute -left-12 -top-12 w-48 h-48 bg-black/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-3">Have the solution?</h3>
                                <p className="text-white/90 text-sm mb-8 leading-relaxed font-medium">
                                    Upload your notes or link an existing file to help {request.user.name} and the community.
                                </p>

                                <FulfillRequestModal
                                    requestId={requestId}
                                    trigger={
                                        <button className="w-full py-4 rounded-xl bg-white text-orange-600 font-bold text-sm tracking-wide hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10">
                                            <CheckCircle2 className="w-5 h-5" />
                                            Fulfill Request
                                        </button>
                                    }
                                />
                            </div>
                        </div>

                        {/* Answers List */}
                        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 dark:border-white/10 shadow-sm">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Answers
                                    <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                                        {request._count.fulfillments}
                                    </span>
                                </h3>
                                {request.status === "FULFILLED" && (
                                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800/30">
                                        Solved
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                {request.fulfillments.map(fulfillment => (
                                    <div key={fulfillment.id} className="group bg-white dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500/50 transition-all shadow-sm hover:shadow-md">
                                        <div className="flex items-start gap-3.5 mb-3">
                                            <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                    {fulfillment.note.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    by {fulfillment.user.name}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/notes/${fulfillment.note.id}`}
                                            className="block w-full py-2.5 text-center rounded-xl bg-gray-50 dark:bg-zinc-900 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                        >
                                            View Content
                                        </Link>
                                    </div>
                                ))}

                                {request.fulfillments.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-50 dark:border-white/5">
                                            <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No answers yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
