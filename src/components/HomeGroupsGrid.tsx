"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Users, ChevronRight } from "lucide-react";
import Image from "next/image";
import { ProfileImage } from "./ProfileImage";
import { GroupDetailsDialog } from "./social/GroupDetailsDialog";
import { useThemeStyle } from "@/components/ThemeStyleProvider";

export function HomeGroupsGrid() {
    const { themeStyle } = useThemeStyle();
    const { data: groups, isLoading } = api.social.getGroups.useQuery();
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    if (isLoading || !groups || groups.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-6xl">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="relative">
                        <Users className={`h-7 w-7 drop-shadow-lg ${themeStyle === "monochrome" ? "text-primary" : "text-purple-500"}`} />
                        <div className={`absolute inset-0 blur-xl rounded-full ${themeStyle === "monochrome" ? "bg-primary/30" : "bg-purple-500/30"}`} />
                    </div>
                    My Groups
                </h2>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {groups.slice(0, 10).map((group) => (
                    <div
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className="group relative cursor-pointer"
                    >
                        {/* iOS-Style Glass Group Card */}
                        <div className={`relative flex flex-col items-center p-6 rounded-2xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] border border-white/25 hover:scale-[1.08] active:scale-[0.95] ${themeStyle === "monochrome"
                            ? "hover:bg-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
                            : "hover:from-purple-400/20 hover:via-pink-400/15 hover:to-blue-400/20 hover:shadow-[0_16px_40px_0_rgba(168,85,247,0.3)] hover:border-purple-300/50"
                            }`}>
                            {/* Inner glow layer */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            {/* Group Icon */}
                            <div className="relative mb-3">
                                <Users className={`h-12 w-12 drop-shadow-lg group-hover:scale-110 transition-transform duration-300 ${themeStyle === "monochrome" ? "text-primary fill-primary/30" : "text-purple-500 fill-purple-500/30"}`} />
                                <div className={`absolute -bottom-1 -right-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/40 shadow-lg ${themeStyle === "monochrome" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-purple-500 to-pink-500"}`}>
                                    {group._count.members}
                                </div>
                            </div>

                            {/* Group Name */}
                            <span className={`text-sm font-semibold text-center truncate w-full text-gray-800 dark:text-gray-200 transition-colors relative z-10 mb-2 ${themeStyle === "monochrome" ? "group-hover:text-primary" : "group-hover:text-purple-600 dark:group-hover:text-purple-400"}`}>
                                {group.name}
                            </span>

                            {/* Member Avatars */}
                            <div className="flex -space-x-2 overflow-hidden mb-1">
                                {group.members.slice(0, 3).map((member) => (
                                    <div
                                        key={member.id}
                                        className="relative inline-block w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-900 overflow-hidden"
                                    >
                                        <ProfileImage
                                            src={null}
                                            alt={member.user.name || "Member"}
                                            width={25}
                                            height={25}
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                                {group._count.members > 3 && (
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-800 text-[9px] font-bold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-zinc-900">
                                        +{group._count.members - 3}
                                    </div>
                                )}
                            </div>

                            {/* Hover Arrow Indicator */}
                            <ChevronRight className={`h-4 w-4 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${themeStyle === "monochrome" ? "text-primary" : "text-purple-500"}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Group Details Dialog - Opens to FILES tab */}
            {selectedGroupId && (
                <GroupDetailsDialog
                    isOpen={!!selectedGroupId}
                    onClose={() => setSelectedGroupId(null)}
                    groupId={selectedGroupId}
                    defaultTab="FILES"
                />
            )}
        </div>
    );
}
