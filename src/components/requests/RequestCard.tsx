"use client";

import { BoardRequestStatus } from "@prisma/client";
import { ArrowBigUp, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileImage } from "../ProfileImage";
import { api } from "@/app/_trpc/client";
import { useState } from "react";

interface RequestCardProps {
    request: {
        id: string;
        title: string;
        description: string;
        status: BoardRequestStatus;
        tags: string[];
        createdAt: Date;
        user: {
            id: string;
            name: string | null;
            image: string | null;
        };
        _count: {
            upvotes: number;
            fulfillments: number;
        };
        isUpvoted: boolean;
    };
}

// Generate consistent pastel colors for tags
const getTagColor = (tag: string) => {
    const colors = [
        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30",
        "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
        "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
        "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30",
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
        "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 border-teal-200 dark:border-teal-500/30",
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
        "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
        "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
        "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
        "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
        "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-500/30",
        "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 border-pink-200 dark:border-pink-500/30",
        "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

import { useRouter } from "next/navigation";



export function RequestCard({ request }: RequestCardProps) {
    const router = useRouter();
    const [upvoted, setUpvoted] = useState(request.isUpvoted);
    const [upvoteCount, setUpvoteCount] = useState(request._count.upvotes);

    const toggleUpvote = api.requests.toggleUpvote.useMutation({
        onMutate: () => {
            const newUpvoted = !upvoted;
            setUpvoted(newUpvoted);
            setUpvoteCount(prev => newUpvoted ? prev + 1 : prev - 1);
        },
        onError: () => {
            setUpvoted(!upvoted);
            setUpvoteCount(prev => !upvoted ? prev + 1 : prev - 1);
        }
    });

    return (
        <div
            onClick={() => router.push(`/requests/${request.id}`)}
            className="group/card relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(234,88,12,0.15)] dark:hover:shadow-[0_8px_20px_-4px_rgba(234,88,12,0.1)] transition-all duration-300 cursor-pointer"
        >
            <div className="flex gap-4">
                {/* Vote Pill */}
                <div className="flex flex-col items-center">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleUpvote.mutate({ requestId: request.id });
                        }}
                        className={cn(
                            "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all duration-200 w-12",
                            upvoted
                                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800"
                                : "bg-gray-50 text-gray-400 dark:bg-zinc-800/50 dark:text-zinc-500 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-zinc-800 dark:hover:text-orange-400"
                        )}
                    >
                        <ArrowBigUp className={cn("w-6 h-6 transition-transform", upvoted && "scale-110 fill-current")} strokeWidth={2} />
                        <span className="text-xs font-bold">{upvoteCount}</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="block group-hover/card:text-orange-600 dark:group-hover/card:text-orange-400 transition-colors">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">
                                {request.title}
                            </h3>
                        </div>
                        {request.status === "FULFILLED" && (
                            <div className="shrink-0 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border border-green-200 dark:border-green-500/20 shadow-sm flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                DONE
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed">
                        {request.description}
                    </p>

                    {/* Tags */}
                    {request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-inherit">
                            {request.tags.map(tag => (
                                <span
                                    key={tag}
                                    className={cn(
                                        "px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border",
                                        getTagColor(tag)
                                    )}
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Meta Footer */}
                    <div className="pt-3 mt-auto flex items-center justify-between border-t border-gray-100 dark:border-zinc-800/50">
                        {/* User */}
                        <div className="flex items-center gap-2">
                            <ProfileImage
                                src={request.user.image}
                                alt={request.user.name || "User"}
                                width={20}
                                height={20}
                                className="w-5 h-5 rounded-full ring-1 ring-gray-200 dark:ring-zinc-700"
                            />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                                {request.user.name}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                            <div className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{request._count.fulfillments} answers</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                            <span>{new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
