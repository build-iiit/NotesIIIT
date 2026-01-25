"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { UserPlus, Check, X, Search, MoreHorizontal } from "lucide-react";
import { AddFriendDialog } from "./AddFriendDialog";
import Image from "next/image";

export function FriendsList() {
    const [showAddDialog, setShowAddDialog] = useState(false);

    // Fetch data
    const { data: friends, isLoading: isLoadingFriends } = api.social.getFriends.useQuery();
    const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = api.social.getFriendRequests.useQuery();

    const respondMutation = api.social.respondToRequest.useMutation({
        onSuccess: () => {
            refetchRequests();
            // Refetch friends too
        }
    });

    return (
        <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/40 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/30">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Filter friends..."
                        className="bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-200 placeholder-gray-500 w-48 sm:w-64"
                    />
                </div>
                <button
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-orange-500 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform"
                >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Friend</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 px-2">Your Friends ({friends?.length || 0})</h3>

                    {isLoadingFriends ? (
                        <div className="text-center py-12 text-gray-500">Loading friends...</div>
                    ) : friends?.length === 0 ? (
                        <div className="text-center py-12 bg-white/20 dark:bg-black/20 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500">No friends yet. Add some people!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {friends?.map((friend) => (
                                <div key={friend.id} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-all group">
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800">
                                        <Image
                                            src={friend.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                                            alt={friend.name || "User"}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{friend.name}</h4>
                                        <p className="text-xs text-gray-500 truncate">Online recently</p>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Requests */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 px-2">Requests</h3>
                    {isLoadingRequests ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : requests?.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500 bg-white/20 dark:bg-black/20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            No pending requests
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests?.map((req) => (
                                <div key={req.id} className="p-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-orange-200 dark:border-orange-900/30 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                            <Image
                                                src={req.sender.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender.id}`}
                                                alt={req.sender.name || "User"}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{req.sender.name}</p>
                                            <p className="text-xs text-gray-500">wants to qualify</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => respondMutation.mutate({ requestId: req.id, status: "ACCEPTED" })}
                                            className="flex-1 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => respondMutation.mutate({ requestId: req.id, status: "REJECTED" })}
                                            className="flex-1 py-1.5 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-all"
                                        >
                                            Ignore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showAddDialog && <AddFriendDialog isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} />}
        </div>
    );
}
