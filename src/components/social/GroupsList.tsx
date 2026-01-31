"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Plus, Users } from "lucide-react";
import { ProfileImage } from "../ProfileImage";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { useThemeStyle } from "@/components/ThemeStyleProvider";

export function GroupsList() {
    const { themeStyle } = useThemeStyle();
    const { data: groups, isLoading, refetch } = api.social.getGroups.useQuery();
    const createGroupMutation = api.social.createGroup.useMutation({
        onSuccess: () => {
            refetch();
        }
    });

    const [filesDialogGroup, setFilesDialogGroup] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const handleCreate = () => {
        if (!newGroupName.trim()) return;
        createGroupMutation.mutate({ name: newGroupName });
        setNewGroupName("");
        setIsCreating(false);
    };

    return (
        <div className="space-y-8">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/40 dark:border-white/10 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white shadow-lg ${themeStyle === "monochrome" ? "bg-primary text-primary-foreground shadow-primary/30" : "bg-gradient-to-tr from-purple-500 to-pink-500 shadow-purple-500/30"}`}>
                        <Users className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white hidden sm:block">Your Groups</h2>
                </div>

                {isCreating ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right">
                        <input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Group Name"
                            className="px-4 py-2 rounded-xl bg-white/50 dark:bg-black/50 border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={createGroupMutation.isPending}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-lg"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform ${themeStyle === "monochrome" ? "bg-gradient-to-tr from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] shadow-primary/30" : "bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-500/30"}`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Group</span>
                    </button>
                )}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading study groups...</div>
            ) : groups?.length === 0 ? (
                <div className="text-center py-16 bg-white/20 dark:bg-black/20 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">You haven&apos;t joined any groups yet.</p>
                    <p className="text-gray-400 text-sm">Create one to start collaborating!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups?.map(group => (
                        <div key={group.id}
                            onClick={() => setFilesDialogGroup(group.id)}
                            className="group relative bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer">
                            {/* Decorative bg blob */}
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -z-10 transition-all ${themeStyle === "monochrome" ? "bg-primary/5 group-hover:bg-primary/10" : "bg-purple-500/10 group-hover:bg-purple-500/20"}`} />

                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${themeStyle === "monochrome" ? "bg-primary/10 text-primary" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300"}`}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-white/50 dark:bg-black/50 rounded-lg text-gray-500">
                                    {group._count.members} Members
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{group.name}</h3>

                            <div className="flex -space-x-2 overflow-hidden mb-4 pl-1">
                                {group.members.map(member => (
                                    <div key={member.id} className="relative inline-block w-8 h-8 rounded-full ring-2 ring-white dark:ring-zinc-900 overflow-hidden">
                                        <ProfileImage
                                            src={member.user.image}
                                            alt={member.user.name || "Member"}
                                            width={33}
                                            height={33}
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                                {group._count.members > 3 && (
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 text-xs font-bold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-zinc-900 z-10">
                                        +{group._count.members - 3}
                                    </div>
                                )}
                            </div>

                            <button className={`w-full py-2.5 rounded-xl transition-colors text-sm font-bold ${themeStyle === "monochrome" ? "bg-white/50 dark:bg-white/5 hover:bg-primary hover:text-primary-foreground text-gray-600 dark:text-gray-300" : "bg-white/50 dark:bg-white/5 hover:bg-purple-500 hover:text-white dark:hover:bg-purple-600 text-gray-600 dark:text-gray-300"}`}>
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {filesDialogGroup && (
                <GroupDetailsDialog
                    isOpen={!!filesDialogGroup}
                    onClose={() => setFilesDialogGroup(null)}
                    groupId={filesDialogGroup}
                />
            )}
        </div>
    );
}
