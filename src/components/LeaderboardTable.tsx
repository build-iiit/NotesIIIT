"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { ProfileImage } from "./ProfileImage";

type UserWithScore = {
    id: string;
    name: string | null;
    image: string | null;
    totalScore: number;
    _count: { notes: number };
};

export function LeaderboardTable() {
    const { data: topNotes } = api.leaderboards.topNotes.useQuery();
    const { data: topContributors } = api.leaderboards.topContributors.useQuery();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Notes */}
            <div className="backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] shadow-xl rounded-2xl p-6 border border-white/20 dark:border-white/10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-3xl">🔥</span> Top Notes by Upvotes
                </h2>
                <div className="space-y-3">
                    {topNotes?.map((note, idx) => (
                        <Link
                            key={note.id}
                            href={`/notes/${note.id}`}
                            className="flex items-center gap-4 p-3 rounded-xl bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-orange-400/30"
                        >
                            <span className={`text-2xl font-black w-8 text-center ${idx === 0 ? "text-yellow-400" :
                                idx === 1 ? "text-gray-400" :
                                    idx === 2 ? "text-amber-700" : "text-gray-300"
                                }`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate group-hover:text-orange-500 transition-colors">
                                    {note.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {note.voteScore} {note.voteScore === 1 ? 'upvote' : 'upvotes'} • By {note.author.name}
                                </p>
                            </div>
                        </Link>
                    ))}
                    {!topNotes?.length && <div className="text-gray-400 text-center py-4">No stats yet</div>}
                </div>
            </div>

            {/* Top Contributors */}
            <div className="backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] shadow-xl rounded-2xl p-6 border border-white/20 dark:border-white/10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-3xl">🏆</span> Top Contributors
                </h2>
                <div className="space-y-3">
                    {topContributors?.map((user: UserWithScore, idx) => (
                        <Link
                            key={user.id}
                            href={`/users/${user.id}`}
                            className="flex items-center gap-4 p-3 rounded-xl bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-orange-400/30"
                        >
                            <ProfileImage
                                src={user.image}
                                alt={user.name || "User avatar"}
                                fallback={user.name || "User"}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/20"
                            />
                            <div className="flex-1">
                                <h3 className="font-semibold group-hover:text-orange-500 transition-colors">
                                    {user.name}
                                </h3>
                                <div className="text-xs text-gray-500 font-medium bg-white/10 dark:bg-black/20 inline-block px-2 py-0.5 rounded-full mt-1">
                                    {(user as unknown as { totalScore: number }).totalScore} karma • {user._count.notes} notes
                                </div>
                            </div>
                            {idx < 3 && (
                                <span className="text-2xl">
                                    {idx === 0 ? "👑" : idx === 1 ? "🥈" : "🥉"}
                                </span>
                            )}
                        </Link>
                    ))}
                    {!topContributors?.length && <div className="text-gray-400 text-center py-4">No stats yet</div>}
                </div>
            </div>
        </div>
    );
}
