"use client";

import { api } from "@/app/_trpc/client";
import { ArrowBigUp, Calendar, CheckCircle2, MessageSquare, Tag, User, Clock, Trash2, MoreVertical, Heart, Reply, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ProfileImage } from "@/components/ProfileImage";
import { ReportButton } from "@/components/ReportButton";
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
    const requestId = params.requestId as string;

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
        <div className="min-h-screen pt-32 flex justify-center bg-white dark:bg-black">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
    );

    if (!request) return (
        <div className="min-h-screen pt-32 text-center bg-white dark:bg-black">
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
                className={cn("group relative", isChild ? "mt-3 pl-4 md:pl-8 border-l-2 border-gray-100 dark:border-zinc-800" : "mt-6")}
            >
                {!isChild && (
                    <div className="absolute -left-[29px] top-0 p-1 bg-white dark:bg-black z-10 hidden md:block">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                    </div>
                )}

                <div className="flex items-start gap-3">
                    <ProfileImage src={comment.user.image} width={32} height={32} className="rounded-full w-8 h-8 mt-1 border border-gray-200 dark:border-zinc-700" />

                    <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:border-gray-300 dark:hover:border-zinc-700">
                            <div className="flex items-baseline justify-between mb-1">
                                <span className="font-bold text-sm text-gray-900 dark:text-white mr-2">{comment.user.name}</span>
                                <span className="text-xs text-gray-400 font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>

                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                        </div>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-4 mt-2 ml-1">
                            <button
                                onClick={() => toggleCommentUpvote.mutate({ commentId: comment.id })}
                                className={cn("text-xs font-bold flex items-center gap-1 transition-colors",
                                    comment.isUpvoted ? "text-pink-600" : "text-gray-500 hover:text-pink-500"
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
                                className="text-xs font-bold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                            >
                                <Reply className="w-3.5 h-3.5" /> Reply
                            </button>

                            {/* Only show report button for authenticated users */}
                            {session?.user && (
                                <ReportButton
                                    targetType="comment"
                                    targetId={comment.id}
                                    targetTitle={`Comment by ${comment.user.name || 'User'}`}
                                    variant="icon"
                                    className="!p-1"
                                />
                            )}
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
        <div className="min-h-screen pt-24 pb-12 px-4 max-w-6xl mx-auto bg-white dark:bg-black">
            {/* Breadcrumb / Back */}
            <div className="mb-6 flex justify-between items-center">
                <Link href="/requests" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    ← Back to Request Board
                </Link>

                {canManage && (
                    <div className="flex gap-2">
                        {request.status !== "FULFILLED" && (
                            <button
                                onClick={() => markFulfilled.mutate({ requestId: request.id })}
                                className="text-xs font-bold text-green-600 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                            >
                                Mark Complete
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to delete this request?")) deleteRequest.mutate({ requestId: request.id });
                            }}
                            className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                )}

                {/* Report button for authenticated non-authors */}
                {session?.user && !canManage && (
                    <ReportButton
                        targetType="request"
                        targetId={request.id}
                        targetTitle={request.title}
                        variant="button"
                        className="text-xs font-bold"
                    />
                )}
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Details & Discussion (8 cols) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Main Request Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none relative overflow-hidden">
                        <div className="flex gap-6 relative z-10">
                            {/* Vote Column */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => toggleUpvote.mutate({ requestId: request.id })}
                                    className={cn(
                                        "p-3 rounded-2xl transition-all duration-300 border",
                                        request.isUpvoted
                                            ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50"
                                            : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200 dark:bg-zinc-800 dark:text-gray-500 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700"
                                    )}
                                >
                                    <ArrowBigUp className={cn("w-8 h-8 transition-transform", request.isUpvoted && "scale-110 fill-current")} strokeWidth={1.5} />
                                </button>
                                <span className="font-bold text-xl text-gray-900 dark:text-gray-100">{request._count.upvotes}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3">
                                        {request.title}
                                    </h1>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 text-xs font-medium">
                                            <ProfileImage src={request.user.image} width={18} height={18} className="rounded-full w-5 h-5" />
                                            <span className="text-gray-700 dark:text-gray-300">{request.user.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 text-xs">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(request.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                        {request.status === "FULFILLED" && (
                                            <span className="flex items-center gap-1.5 pl-2 text-green-600 dark:text-green-400 font-bold uppercase text-xs tracking-wide">
                                                <CheckCircle2 className="w-4 h-4 fill-green-100 dark:fill-green-900/50" />
                                                Fulfilled
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-lg text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {request.description}
                                    </p>
                                </div>

                                {request.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {request.tags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700">
                                                <Tag className="w-3.5 h-3.5 opacity-50" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Discussion Section */}
                    <div className="pt-4">
                        <div className="flex items-center gap-3 mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-gray-400" />
                                Discussion
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-600 dark:text-gray-400">
                                {request.comments.length}
                            </span>
                        </div>

                        {/* Comment Input */}
                        <div className="bg-gray-50 dark:bg-zinc-900/30 rounded-2xl p-4 mb-8 border border-gray-100 dark:border-zinc-800/50 scroll-mt-24" id="comment-box">
                            {replyTo && (
                                <div className="flex items-center justify-between mb-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                                    <span>Replying to {replyTo.name}</span>
                                    <button onClick={() => setReplyTo(null)} className="hover:text-red-500"><X className="w-4 h-4" /></button>
                                </div>
                            )}
                            <textarea
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment or ask for details..."}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none min-h-[100px] resize-y text-sm transition-all"
                            />
                            <div className="flex justify-end mt-3">
                                <button
                                    onClick={() => addComment.mutate({ requestId: request.id, content: commentContent, parentId: replyTo?.id })}
                                    disabled={!commentContent.trim() || addComment.isPending}
                                    className="px-5 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-80 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {addComment.isPending && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                                    {replyTo ? "Post Reply" : "Post Comment"}
                                </button>
                            </div>
                        </div>

                        {/* Comments Stream */}
                        <div className="space-y-6 relative pl-4 md:pl-0 border-l-2 md:border-l-0 border-gray-100 dark:border-zinc-800 ml-4 md:ml-0">
                            <div className="absolute left-[3px] top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-zinc-800 md:hidden" />
                            {rootComments.map(comment => (
                                <CommentItem key={comment.id} comment={comment} />
                            ))}
                            {rootComments.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-10">No comments yet. Be the first to start the discussion!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Fulfillment & Answers (4 cols) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">

                    {/* CTA Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Have the solution?</h3>
                            <p className="text-white/90 text-sm mb-6 leading-relaxed">
                                Upload your notes or link an existing file to help {request.user.name} and the community.
                            </p>

                            <FulfillRequestModal
                                requestId={requestId}
                                trigger={
                                    <button className="w-full py-3.5 rounded-xl bg-white text-orange-600 font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Fulfill Request
                                    </button>
                                }
                            />
                        </div>
                        {/* Background Deco */}
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -left-10 -top-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
                    </div>

                    {/* Answers List */}
                    <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                Answers ({request._count.fulfillments})
                            </h3>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Verified</span>
                        </div>

                        <div className="space-y-3">
                            {request.fulfillments.map(fulfillment => (
                                <div key={fulfillment.id} className="group bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500/50 transition-all shadow-sm">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                {fulfillment.note.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                by {fulfillment.user.name}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/notes/${fulfillment.note.id}`}
                                        className="block w-full py-2 text-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                    >
                                        View Content
                                    </Link>
                                </div>
                            ))}

                            {request.fulfillments.length === 0 && (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 dark:border-zinc-700">
                                        <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No answers yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
