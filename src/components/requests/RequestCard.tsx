"use client";

import { BoardRequestStatus } from"@prisma/client";
import { ArrowBigUp, MessageSquare, CheckCircle2 } from"lucide-react";
import { cn } from"@/lib/utils";
import { ProfileImage } from"../ProfileImage";
import { api } from"@/app/_trpc/client";
import { useState } from"react";

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

// Generate consistent minimalist theme colors for tags
const getTagColor = (tag: string) => {
 return"bg-primary/5 text-primary dark:bg-primary/10 border-primary/20 dark:border-primary/30";
};

import { useRouter } from"next/navigation";



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
 className="group/card relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_var(--glow-color)] transition-all duration-300 cursor-pointer"
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
 ?"bg-primary/10 text-primary ring-1 ring-primary/20 dark:ring-primary/30"
 :"bg-gray-50 text-gray-400 dark:bg-zinc-800/50 dark:text-zinc-500 hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800/80 dark:hover:text-primary"
 )}
 >
 <ArrowBigUp className={cn("w-6 h-6 transition-transform", upvoted &&"scale-110 fill-current")} strokeWidth={2} />
 <span className="text-xs font-bold">{upvoteCount}</span>
 </button>
 </div>

 {/* Main Content */}
 <div className="flex-1 min-w-0 flex flex-col gap-3">
 {/* Header */}
 <div className="flex items-start justify-between gap-3">
 <div className="block group-hover/card:text-primary transition-colors">
 <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">
 {request.title}
 </h3>
 </div>
 {request.status ==="FULFILLED" && (
 <div className="shrink-0 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border border-primary/20 shadow-sm flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
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
 alt={request.user.name ||"User"}
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
 <span>{new Date(request.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
