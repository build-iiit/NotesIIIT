"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { X, Search, UserPlus, Check } from "lucide-react";
import Image from "next/image";
import { ProfileImage } from "../ProfileImage";

interface AddFriendDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddFriendDialog({ isOpen, onClose }: AddFriendDialogProps) {
    if (!isOpen) return null;

    const [query, setQuery] = useState("");
    const { data: results, isLoading } = api.social.searchUsers.useQuery(
        { query },
        { enabled: query.length > 1 }
    );

    const sendRequestMutation = api.social.sendFriendRequest.useMutation();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Find Friends</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 space-y-6">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl leading-5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                            placeholder="Search by name or email..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Results */}
                    <div className="space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                        {query.length < 2 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-50">
                                <Search className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
                            </div>
                        ) : isLoading ? (
                            <div className="text-center py-10 text-gray-500">Searching...</div>
                        ) : results?.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No users found.</div>
                        ) : (
                            results?.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-700">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                                            <ProfileImage
                                                src={null}
                                                alt={user.name || ""}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-gray-100">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => sendRequestMutation.mutate({ userId: user.id })}
                                        disabled={sendRequestMutation.isPending || sendRequestMutation.isSuccess}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${sendRequestMutation.isSuccess
                                            ? "bg-green-100 text-green-600"
                                            : "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40"
                                            }`}
                                    >
                                        {sendRequestMutation.isSuccess ? (
                                            <>
                                                <Check className="w-3 h-3" /> Sent
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-3 h-3" /> Add
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
