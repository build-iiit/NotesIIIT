"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { X, Search, UserPlus, Users, Trophy, Settings, FileText, Trash2, Edit2, Save } from "lucide-react";
import Image from "next/image";
import { ProfileImage } from "../ProfileImage";


interface GroupDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    defaultTab?: Tab;
}

type Tab = 'MEMBERS' | 'FILES' | 'SETTINGS';

export function GroupDetailsDialog({ isOpen, onClose, groupId, defaultTab = 'MEMBERS' }: GroupDetailsDialogProps) {
    const { data: user } = api.auth.getMe.useQuery();
    const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
    const [isAdding, setIsAdding] = useState(false);
    const [query, setQuery] = useState("");

    // Group Data
    const { data: group, isLoading, refetch } = api.social.getGroupDetails.useQuery({ groupId });
    const { data: groupFiles, isLoading: isLoadingFiles } = api.social.getGroupFiles.useQuery(
        { groupId },
        { enabled: activeTab === 'FILES' }
    );

    // Mutations
    const addMemberMutation = api.social.addGroupMember.useMutation({ onSuccess: () => refetch() });
    const updateGroupMutation = api.social.updateGroup.useMutation({ onSuccess: () => refetch() });
    const deleteGroupMutation = api.social.deleteGroup.useMutation({ onSuccess: () => onClose() });

    // Settings State
    const [editName, setEditName] = useState("");

    if (!isOpen) return null;

    const currentUserMember = group?.members.find((m: any) => m.user.id === user?.id);
    const isAdmin = currentUserMember?.role === 'ADMIN';

    const handleUpdateName = () => {
        if (editName && editName !== group?.name) {
            updateGroupMutation.mutate({ groupId, name: editName });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-purple-600 to-pink-600 shrink-0">
                    <div className="absolute inset-0 bg-black/10" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 text-white hover:bg-black/40 rounded-full backdrop-blur-md transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute -bottom-10 left-8 flex items-end gap-4">
                        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-zinc-900 p-1 shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                                {group?.image ? (
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden">
                                        <Image src={group.image} fill alt={group.name} className="object-cover" unoptimized />
                                    </div>
                                ) : (
                                    <Users className="w-10 h-10" />
                                )}
                            </div>
                        </div>
                        <div className="mb-2">
                            <h2 className="text-2xl font-black text-white drop-shadow-md">{group?.name}</h2>
                            <p className="text-white/80 text-sm font-medium">{group?.members.length || 0} Members</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 px-8 mt-14 border-b border-gray-100 dark:border-white/5 pb-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('MEMBERS')}
                        className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === 'MEMBERS' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        Members
                        {activeTab === 'MEMBERS' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('FILES')}
                        className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === 'FILES' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        Files
                        {activeTab === 'FILES' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full" />}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => { setActiveTab('SETTINGS'); setEditName(group?.name || ""); }}
                            className={`pb-2 text-sm font-bold transition-colors relative ${activeTab === 'SETTINGS' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                        >
                            Settings
                            {activeTab === 'SETTINGS' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full" />}
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
                    {/* MEMBERS TAB */}
                    {activeTab === 'MEMBERS' && (
                        <div className="space-y-6">
                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20">
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Files</span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{groupFiles?.length || 0}</p>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Your Files</span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                                        {groupFiles?.filter((f: any) => f.author?.id === user?.id).length || 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                                        <Trophy className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Top Member</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-900 dark:text-white truncate">
                                        {(() => {
                                            const contributions = groupFiles?.reduce((acc: any, file: any) => {
                                                const authorId = file.author?.id;
                                                if (authorId) acc[authorId] = (acc[authorId] || 0) + 1;
                                                return acc;
                                            }, {});
                                            const topId = contributions && Object.keys(contributions).length > 0
                                                ? Object.entries(contributions).sort(([, a]: any, [, b]: any) => b - a)[0][0]
                                                : null;
                                            const topMember = group?.members.find((m: any) => m.user.id === topId);
                                            return topMember?.user.name?.split(' ')[0] || 'None';
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Members</h3>
                                {isAdmin && !isAdding && (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        + Add Member
                                    </button>
                                )}
                            </div>

                            {/* Add Member Search */}
                            {isAdding && (
                                <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        <input
                                            autoFocus
                                            placeholder="Search user to add..."
                                            className="bg-transparent border-none focus:ring-0 text-sm w-full"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                        <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                    {/* Using existing searchResults query from previous implementation - Assuming imported/hook usage */}
                                    <MemberSearch query={query} group={group} onAdd={(uid) => addMemberMutation.mutate({ groupId, userId: uid })} />
                                </div>
                            )}

                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="text-gray-500 text-center py-4">Loading members...</div>
                                ) : (
                                    group?.members.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-white/10">
                                                    <ProfileImage
                                                        src={null} // Generic enforced
                                                        alt={member.user.name || "Member"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-gray-100">{member.user.name}</p>
                                                    {member.role === 'ADMIN' && <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">Admin</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'FILES' && (
                        <div className="space-y-4">
                            {isLoadingFiles ? (
                                <div className="text-center py-10 text-gray-500">Loading shared files...</div>
                            ) : groupFiles?.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium">No files shared with this group yet.</p>
                                </div>
                            ) : (
                                groupFiles?.map((file: any) => (
                                    <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">{file.title}</h4>
                                                <p className="text-xs text-gray-500">
                                                    Shared by {file.author?.name} • {new Date(file.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={`/note/${file.id}`}
                                            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            View
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'SETTINGS' && isAdmin && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">General Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Group Name</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <button
                                                onClick={handleUpdateName}
                                                disabled={updateGroupMutation.isPending || editName === group?.name}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                                <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-red-900 dark:text-red-200">Delete Group</h4>
                                        <p className="text-sm text-red-700 dark:text-red-400">Permanently delete this group and remove all members.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this group?")) {
                                                deleteGroupMutation.mutate({ groupId });
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper for member search to keep main component clean
function MemberSearch({ query, group, onAdd }: { query: string, group: any, onAdd: (id: string) => void }) {
    const { data: searchResults } = api.social.searchUsers.useQuery(
        { query },
        { enabled: query.length > 1 }
    );

    if (query.length < 2) return null;

    return (
        <div className="space-y-2 max-h-40 overflow-y-auto">
            {searchResults?.map(user => {
                const isMember = group?.members.some((m: any) => m.user.id === user.id);
                return (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden relative">
                                <ProfileImage src={null} fill alt="" />
                            </div>
                            <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        {isMember ? (
                            <span className="text-xs text-green-500 font-medium px-2">Joined</span>
                        ) : (
                            <button
                                onClick={() => onAdd(user.id)}
                                className="text-xs bg-purple-600 text-white px-2 py-1 rounded-md hover:bg-purple-700"
                            >
                                Add
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
