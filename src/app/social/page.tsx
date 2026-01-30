"use client";

import { useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { FriendsList } from "@/components/social/FriendsList";
import { GroupsList } from "@/components/social/GroupsList";
import { Users, UserPlus, Trophy, Folder } from "lucide-react";

export default function SocialPage() {
    const [activeTab, setActiveTab] = useState<"friends" | "groups" | "leaderboard">("friends");

    return (
        <div className="min-h-screen p-4 sm:p-8 pt-20 sm:pt-24 pb-20">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] bg-clip-text text-transparent drop-shadow-sm pb-1">
                        Social Hub
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                        Connect, Collaborate, and Compete.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-1 p-1 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-lg">
                        <button
                            onClick={() => setActiveTab("friends")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "friends"
                                ? "bg-gradient-to-tr from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-white shadow-lg scale-105"
                                : "text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/10"
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Friends
                        </button>
                        <button
                            onClick={() => setActiveTab("groups")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "groups"
                                ? "bg-gradient-to-tr from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-white shadow-lg scale-105"
                                : "text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/10"
                                }`}
                        >
                            <Folder className="w-4 h-4" />
                            Groups
                        </button>
                        <button
                            onClick={() => setActiveTab("leaderboard")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "leaderboard"
                                ? "bg-gradient-to-tr from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-white shadow-lg scale-105"
                                : "text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/10"
                                }`}
                        >
                            <Trophy className="w-4 h-4" />
                            Leaderboard
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "friends" && <FriendsList />}
                    {activeTab === "groups" && <GroupsList />}
                    {activeTab === "leaderboard" && (
                        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl">
                            <LeaderboardTable />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
