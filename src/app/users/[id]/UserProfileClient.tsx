"use client";

import { useState, useEffect } from "react";
import Image from "next/image"; // Keep Image for background checks if needed, but we used it for background too
import Link from "next/link";
import { ProfileImage } from "@/components/ProfileImage";
import { UserStatsCard } from "@/components/UserStatsCard";
import { UserNotesGrid, type Note } from "@/components/UserNotesGrid";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { FileExplorer } from "@/components/FileExplorer"; // Features from main
import { api } from "@/app/_trpc/client";
import {
    FileText, Eye, TrendingUp, Trophy, Award,
    Sparkles, Medal, Edit, Folder, Search, Settings, Key
} from "lucide-react";


// Types from main for safety and search logic
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

interface Badge {
    iconName: string;
    label: string;
    color: string;
}

interface UserProfileClientProps {
    user: UserProfile;
    achievements: Badge[];
    isOwnProfile: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
    Sparkles,
    Award,
    Trophy,
    Medal,
    TrendingUp
};

export function UserProfileClient({ user, achievements, isOwnProfile }: UserProfileClientProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);


    return (
        <div className="min-h-screen pb-12 relative overflow-hidden">
            {/* UI from Feature-additions: Background Decorations */}
            <div className={`fixed top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--gradient-from)] via-[var(--gradient-via)] to-[var(--gradient-to)] -z-20 ${true ? "opacity-10" : "opacity-30"}`} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="relative pt-8 pb-12">
                    {/* Glassy Banner */}
                    <div className={`absolute inset-x-0 top-0 h-48 rounded-3xl shadow-2xl overflow-hidden -z-10 bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)] opacity-90 ${true ? 'grayscale brightness-50 dark:brightness-[0.2]' : ''}`}>
                        {user.backgroundImage && (
                            <Image
                                src={user.backgroundImage}
                                alt="Profile Background"
                                fill
                                className="object-cover"
                                priority
                                unoptimized
                            />
                        )}
                        {/* <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" /> */}
                    </div>

                    <div className="relative pt-24 text-center">
                        {/* Avatar with Glow */}
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] rounded-full blur-2xl opacity-40 animate-pulse" />
                            <div className="relative w-32 h-32 rounded-full border-4 border-white/50 dark:border-zinc-900/50 shadow-2xl bg-white/20 backdrop-blur-xl overflow-hidden">
                                <ProfileImage
                                    src={null}
                                    alt={user.name || "User"}
                                    fallback={user.name || "User"}
                                    width={120}
                                    height={120}
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white dark:border-zinc-900 rounded-full shadow-lg" />
                        </div>

                        {/* Edit Button - Feature UI */}
                        {isOwnProfile && (
                            <div className="absolute top-32 right-0 sm:right-4">
                                <button
                                    onClick={() => setIsEditOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-800 dark:text-gray-100 backdrop-blur-3xl bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/10 hover:bg-white/40 transition-all shadow-xl hover:scale-105 active:scale-95"
                                >
                                    <Edit size={16} className="text-primary" />
                                    Edit Profile
                                </button>
                            </div>
                        )}

                        <div className="mt-6 space-y-2">
                            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
                                {user.name}
                            </h1>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>

                        {/* Achievements - Badges from main */}
                        {achievements.length > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                {achievements.map((achievement, index) => {
                                    const Icon = ICON_MAP[achievement.iconName] || Trophy;
                                    return (
                                        <div key={index} className="px-4 py-2 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/5 shadow-sm flex items-center gap-2 hover:scale-110 transition-transform">
                                            <Icon className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold dark:text-gray-200">{achievement.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* The "My Files" Section UI from Feature-additions */}
                {isOwnProfile && (
                    <div className="mb-12 space-y-8">
                        <div className="flex justify-center">
                            <Link
                                href="/my-files"
                                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-gray-800 dark:text-white backdrop-blur-3xl bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-transparent border border-white/50 dark:border-white/10 shadow-2xl hover:shadow-primary/20 transition-all hover:-translate-y-1"
                            >
                                <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${true ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                                    <Folder className={`h-6 w-6 ${true ? "text-primary-foreground" : "text-primary"}`} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm leading-tight">Personal Workspace</p>
                                    <p className="text-xs text-gray-500 font-medium">View My Files & Folders</p>
                                </div>
                            </Link>
                        </div>

                        {/* Feature: File Explorer (The functional search/explorer from main) */}
                        <div className="backdrop-blur-2xl bg-white/10 dark:bg-black/5 rounded-3xl border border-white/20 dark:border-white/5 p-1 shadow-inner">
                            <FileExplorer userId={user.id} />
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    <UserStatsCard
                        icon={FileText}
                        value={user._count.notes}
                        label="Notes"
                        gradientFrom={true ? "primary" : "orange-500"}
                        gradientTo={true ? "primary" : "rose-500"}
                    />
                    <UserStatsCard
                        icon={Eye}
                        value={user.totalViews}
                        label="Views"
                        gradientFrom={true ? "primary" : "blue-500"}
                        gradientTo={true ? "primary" : "indigo-600"}
                    />
                    <UserStatsCard
                        icon={TrendingUp}
                        value={user.totalKarma}
                        label="Karma"
                        gradientFrom={true ? "primary" : "emerald-500"}
                        gradientTo={true ? "primary" : "teal-600"}
                    />
                    <UserStatsCard
                        icon={Trophy}
                        value={`#${user.rank}`}
                        label="Rank"
                        gradientFrom={true ? "primary" : "purple-500"}
                        gradientTo={true ? "primary" : "fuchsia-600"}
                    />
                </div>

                {/* Notes Section with UserNotesGrid (which handles the search/filter features) */}
                <div className="space-y-6">
                    <div className="flex items-end justify-between px-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Shared Library
                        </h2>
                    </div>

                    <div className="backdrop-blur-xl bg-white/20 dark:bg-white/5 rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-xl">
                        <UserNotesGrid
                            notes={user.notes}
                            userName={user.name || undefined}
                        />
                    </div>
                </div>
            </div>

            {/* Settings Section (Own Profile Only) */}
            {isOwnProfile && <SettingsSection />}

            {isEditOpen && (
                <EditProfileDialog
                    user={user}
                    onClose={() => setIsEditOpen(false)}
                />
            )}
        </div>
    );
}

// Settings Section Component
function SettingsSection() {
    const [showConfirm, setShowConfirm] = useState(false);
    const { data: apiKeyStatus, refetch: refetchApiKeyStatus } = api.auth.hasGeminiApiKey.useQuery();

    const revokeKeyMutation = api.auth.revokeGeminiApiKey.useMutation({
        onSuccess: () => {
            refetchApiKeyStatus();
            setShowConfirm(false);
        }
    });

    // Theme Style Logic

    // Local storage and class toggling is now handled in ThemeStyleProvider

    const toggleThemeStyle = (style: "sunset" | "monochrome") => {

    };

    return (
        <div className="mb-12 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 px-2">
                <Settings className="h-5 w-5 text-primary" />
                Settings
            </h2>

            {/* API Key Section */}
            <div className="backdrop-blur-xl bg-white/20 dark:bg-white/5 rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gemini API Key</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {apiKeyStatus?.hasKey
                                ? "Your personal API key is configured for AI features"
                                : "No API key configured - you'll be prompted when using AI features"}
                        </p>
                    </div>

                    {apiKeyStatus?.hasKey && (
                        <div className="flex items-center gap-2">
                            {!showConfirm ? (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                >
                                    <Key className="w-4 h-4 inline mr-2" />
                                    Revoke Key
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Are you sure?</span>
                                    <button
                                        onClick={() => revokeKeyMutation.mutate()}
                                        disabled={revokeKeyMutation.isPending}
                                        className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                                    >
                                        {revokeKeyMutation.isPending ? "Revoking..." : "Yes, Revoke"}
                                    </button>
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Theme Style Toggle */}
            <div className="backdrop-blur-xl bg-white/20 dark:bg-white/5 rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Theme Style</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Choose between the vibrant Sunset theme or a clean Black & White look
                        </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl border border-white/20 dark:border-white/5">
                        <button
                            onClick={() => toggleThemeStyle("sunset")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${false
                                ? "bg-white dark:bg-zinc-800 text-orange-500 shadow-md"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            Sunset
                        </button>
                        <button
                            onClick={() => toggleThemeStyle("monochrome")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${true
                                ? "bg-white dark:bg-white text-black shadow-md border border-gray-200"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            Monochrome
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
