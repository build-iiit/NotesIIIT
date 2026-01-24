"use client";

import { UserStatsCard } from "@/components/UserStatsCard";
import { UserNotesGrid } from "@/components/UserNotesGrid";
import { type Note } from "@/components/UserNotesGrid";
import { FileExplorer } from "@/components/FileExplorer";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { FileText, Eye, TrendingUp, Trophy, Award, Sparkles, Medal, Edit } from "lucide-react";
import Image from "next/image";
import { useState } from "react";



interface Badge {
    iconName: string;
    label: string;
    color: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    Sparkles,
    Award,
    Trophy,
    Medal,
    TrendingUp
};

interface UserProfile {
    id: string;
    name: string | null;
    image: string | null;
    backgroundImage: string | null;
    createdAt: Date | string;
    _count: {
        notes: number;
    };
    totalViews: number;
    totalKarma: number;
    rank: number;
    notes: Note[];
}

interface UserProfileClientProps {
    user: UserProfile;
    achievements: Badge[];
    isOwnProfile: boolean;
}

export function UserProfileClient({ user, achievements, isOwnProfile }: UserProfileClientProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    return (
        <div className="min-h-screen pb-12">
            {/* Background decorations */}
            <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-600/10 -z-10" />
            <div className="fixed top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
            <div className="fixed top-40 -right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="relative pt-8 pb-12">
                    {/* Gradient Banner or Custom Background */}
                    <div className="absolute inset-x-0 top-0 h-48 rounded-3xl shadow-2xl overflow-hidden -z-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                        {user.backgroundImage ? (
                            <Image
                                src={user.backgroundImage}
                                alt="Profile Background"
                                fill
                                className="object-cover opacity-90"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
                        )}
                    </div>

                    <div className="relative pt-24 text-center">
                        {/* Avatar */}
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-xl opacity-50" />
                            <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-zinc-900 shadow-2xl bg-white overflow-hidden">
                                <Image
                                    src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                    alt={user.name!}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {/* Online indicator */}
                            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white dark:border-zinc-900 rounded-full" />
                        </div>

                        {/* Edit Button for Owner */}
                        {isOwnProfile && (
                            <div className="absolute top-28 right-0 sm:right-10 flex justify-center w-full sm:w-auto mt-4 px-4 sm:mt-0 sm:px-0 pointer-events-none sm:pointer-events-auto">
                                <button
                                    onClick={() => setIsEditOpen(true)}
                                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-white/20 text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Edit size={16} />
                                    Edit Profile
                                </button>
                            </div>
                        )}

                        {/* Name and info */}
                        <div className="mt-6 space-y-2">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                                {user.name}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Achievements */}
                        {achievements.length > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                {achievements.map((achievement, index) => {
                                    const Icon = ICON_MAP[achievement.iconName] || Trophy;
                                    const colorMap: Record<string, string> = {
                                        blue: "from-blue-500 to-blue-600",
                                        purple: "from-purple-500 to-purple-600",
                                        yellow: "from-yellow-500 to-yellow-600",
                                        gold: "from-yellow-400 to-orange-500",
                                        green: "from-green-500 to-green-600",
                                    };

                                    return (
                                        <div
                                            key={index}
                                            className="group relative"
                                        >
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${colorMap[achievement.color]} text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}>
                                                <Icon className="h-4 w-4" />
                                                <span className="text-sm font-medium">{achievement.label}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {isOwnProfile && (
                    <div className="mb-12">
                        <FileExplorer userId={user.id} />
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <UserStatsCard
                        icon={FileText}
                        value={user._count.notes}
                        label="Notes Shared"
                        gradientFrom="blue-500"
                        gradientTo="indigo-600"
                    />
                    <UserStatsCard
                        icon={Eye}
                        value={user.totalViews}
                        label="Total Views"
                        gradientFrom="purple-500"
                        gradientTo="pink-600"
                    />
                    <UserStatsCard
                        icon={TrendingUp}
                        value={user.totalKarma}
                        label="Karma Score"
                        gradientFrom="green-500"
                        gradientTo="emerald-600"
                    />
                    <UserStatsCard
                        icon={Trophy}
                        value={`#${user.rank}`}
                        label="Leaderboard Rank"
                        gradientFrom="yellow-500"
                        gradientTo="orange-600"
                    />
                </div>

                {/* Notes Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Shared Notes
                        </h2>
                        {user.notes.length > 0 && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {user.notes.length} of {user._count.notes} notes
                            </span>
                        )}
                    </div>

                    <UserNotesGrid
                        notes={user.notes}
                        userName={user.name || undefined}
                    />
                </div>
            </div>

            {isEditOpen && (
                <EditProfileDialog
                    user={user}
                    onClose={() => setIsEditOpen(false)}
                />
            )}
        </div>
    );
}
