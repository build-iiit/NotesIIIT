"use client";

import { api } from "@/app/_trpc/client";
import Link from "next/link";

export function LeaderboardTable() {
    const { data: topNotes } = api.leaderboards.trending.useQuery();
    const { data: topContributors } = api.leaderboards.topContributors.useQuery();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Notes */}
            <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-3xl">🔥</span> Trending Notes
                </h2>
                <div className="space-y-4">
                    {topNotes?.map((note, idx) => (
                        <Link
                            key={note.id}
                            href={`/notes/${note.id}`}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            <span className={`text-2xl font-black w-8 text-center ${idx === 0 ? "text-yellow-400" :
                                idx === 1 ? "text-gray-400" :
                                    idx === 2 ? "text-amber-700" : "text-gray-300"
                                }`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate group-hover:text-blue-600 transition-colors">
                                    {note.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {note.voteScore} upvotes • {note.viewCount} views • By {note.author.name}
                                </p>
                            </div>
                        </Link>
                    ))}
                    {!topNotes?.length && <div className="text-gray-400 text-center py-4">No stats yet</div>}
                </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-3xl">🏆</span> Top Contributors
                </h2>
                <div className="space-y-4">
                    {topContributors?.map((user, idx) => (
                        <Link
                            key={user.id}
                            href={`/users/${user.id}`}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                alt={user.name!}
                                className="w-10 h-10 rounded-full bg-gray-200"
                            />
                            <div className="flex-1">
                                <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                                    {user.name}
                                </h3>
                                <div className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-zinc-800 inline-block px-2 py-0.5 rounded-full mt-1">
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
