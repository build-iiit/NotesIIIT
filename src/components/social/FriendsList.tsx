"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { UserPlus, Search, MoreHorizontal, UserMinus, ExternalLink } from "lucide-react";
import { AddFriendDialog } from "./AddFriendDialog";
import { ProfileImage } from "@/components/ProfileImage";
import Link from "next/link";

// import Link from "next/link";
import { useThemeStyle } from "@/components/ThemeStyleProvider";

export function FriendsList() {
    const { themeStyle } = useThemeStyle();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const utils = api.useUtils();

    // Fetch data
    const { data: friends, isLoading: isLoadingFriends } = api.social.getFriends.useQuery();
    const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = api.social.getFriendRequests.useQuery();

    const respondMutation = api.social.respondToRequest.useMutation({
        onSuccess: () => {
            refetchRequests();
        }
    });

    const removeFriendMutation = api.social.removeFriend.useMutation({
        onSuccess: () => {
            utils.social.getFriends.invalidate();
            setOpenDropdown(null);
            setConfirmRemove(null);
        }
    });

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
                setConfirmRemove(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRemoveFriend = (friendId: string) => {
        if (confirmRemove === friendId) {
            removeFriendMutation.mutate({ friendId });
        } else {
            setConfirmRemove(friendId);
        }
    };

    return (
        <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/40 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white shadow-lg ${themeStyle === "monochrome" ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-blue-500/30"}`}>
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
                    className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform ${themeStyle === "monochrome" ? "bg-gradient-to-tr from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] shadow-primary/30" : "bg-gradient-to-tr from-orange-500 to-pink-500 shadow-orange-500/30"}`}
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
                                <div key={friend.id} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-all group relative">
                                    <Link href={`/users/${friend.id}`} className="flex-1 flex items-center gap-4 min-w-0">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shrink-0">
                                            <ProfileImage
                                                src={friend.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                                                alt={friend.name || "User"}
                                                fallback={friend.name || "User"}
                                                width={45}
                                                height={45}
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate hover:text-blue-500 transition-colors">{friend.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">Online recently</p>
                                        </div>
                                    </Link>

                                    {/* Dropdown Button */}
                                    <div className="relative" ref={openDropdown === friend.id ? dropdownRef : null}>
                                        <button
                                            onClick={() => setOpenDropdown(openDropdown === friend.id ? null : friend.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 bg-white/30 dark:bg-black/30 rounded-lg hover:bg-white/50 dark:hover:bg-black/50 transition-colors"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openDropdown === friend.id && (
                                            <div className="absolute right-0 top-full mt-2 w-48 py-2 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-white/40 dark:border-white/10 shadow-xl z-50">
                                                <Link
                                                    href={`/users/${friend.id}`}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View Profile
                                                </Link>
                                                <button
                                                    onClick={() => handleRemoveFriend(friend.id)}
                                                    disabled={removeFriendMutation.isPending}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${confirmRemove === friend.id
                                                        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/5"
                                                        }`}
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                    {removeFriendMutation.isPending
                                                        ? "Removing..."
                                                        : confirmRemove === friend.id
                                                            ? "Click again to confirm"
                                                            : "Remove Friend"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                            <ProfileImage
                                                src={req.sender.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender.id}`}
                                                alt={req.sender.name || "User"}
                                                fallback={req.sender.name || "User"}
                                                width={45}
                                                height={45}
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{req.sender.name}</p>
                                            <p className="text-xs text-gray-500">wants to connect</p>
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
