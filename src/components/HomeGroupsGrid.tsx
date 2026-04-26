"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Users, ChevronRight } from "lucide-react";
import { ProfileImage } from "./ProfileImage";
import { GroupDetailsDialog } from "./social/GroupDetailsDialog";

export function HomeGroupsGrid() {
    const { data: groups, isLoading } = api.social.getGroups.useQuery();
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    if (isLoading || !groups || groups.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    My Groups
                </h2>
                <div className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
                    View all <ChevronRight className="h-3 w-3" />
                </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groups.slice(0, 10).map((group) => (
                    <div
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className="group flex flex-col items-start p-4 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                        {/* Group Icon & Count */}
                        <div className="flex items-start justify-between w-full mb-3">
                            <Users className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {group._count.members}
                            </span>
                        </div>

                        {/* Group Name */}
                        <span className="text-sm font-medium text-foreground truncate w-full mb-2">
                            {group.name}
                        </span>

                        {/* Member Avatars */}
                        <div className="flex -space-x-2 overflow-hidden mt-auto">
                            {group.members.slice(0, 3).map((member) => (
                                <div
                                    key={member.id}
                                    className="relative inline-block w-5 h-5 rounded-full ring-1 ring-background overflow-hidden"
                                >
                                    <ProfileImage
                                        src={null}
                                        alt={member.user.name || "Member"}
                                        width={20}
                                        height={20}
                                        className="object-cover"
                                        fallback={member.user.name || "Member"}
                                    />
                                </div>
                            ))}
                            {group._count.members > 3 && (
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-[8px] font-bold text-muted-foreground ring-1 ring-background">
                                    +{group._count.members - 3}
                                </div>
                            )}
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
