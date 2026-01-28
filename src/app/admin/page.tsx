"use client";

import { useState, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminNotesTable } from "@/components/admin/AdminNotesTable";
import { AdminCoursesTable } from "@/components/admin/AdminCoursesTable";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminReportsQueue } from "@/components/admin/AdminReportsQueue";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";
import { AdminSystemHealth } from "@/components/admin/AdminSystemHealth";
import { AdminLeaderboardControl } from "@/components/admin/AdminLeaderboardControl";
import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    FileText,
    BookOpen,
    Shield,
    AlertCircle,
    Settings,
    Flag,
    ScrollText,
    Crown,
    Activity,
    Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";

type TabType = "overview" | "users" | "notes" | "courses" | "settings" | "reports" | "audit" | "system" | "leaderboard";

// Helper to check if user has admin access
function isAdminRole(role: string | undefined): boolean {
    return ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role || "");
}

// Helper to check if user is super admin
function isSuperAdmin(role: string | undefined): boolean {
    return role === "SUPER_ADMIN";
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        SUPER_ADMIN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        MODERATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        USER: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400",
    };

    const icons: Record<string, React.ReactNode> = {
        SUPER_ADMIN: <Crown className="w-3 h-3" />,
        ADMIN: <Shield className="w-3 h-3" />,
        MODERATOR: <Shield className="w-3 h-3" />,
        USER: <Users className="w-3 h-3" />,
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.USER}`}>
            {icons[role] || icons.USER}
            {role.replace("_", " ")}
        </span>
    );
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const router = useRouter();
    const { data: currentUser, isLoading } = api.auth.getMe.useQuery();

    // Redirect if not admin
    useEffect(() => {
        if (!isLoading && (!currentUser || !isAdminRole(currentUser.role))) {
            router.push("/");
        }
    }, [currentUser, isLoading, router]);

    // Show loading or unauthorized state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentUser || !isAdminRole(currentUser.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        You need administrator privileges to access this page.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Define tabs based on role
    const baseTabs = [
        { id: "overview" as TabType, name: "Overview", icon: LayoutDashboard },
        { id: "users" as TabType, name: "Users", icon: Users },
        { id: "notes" as TabType, name: "Notes", icon: FileText },
        { id: "courses" as TabType, name: "Courses", icon: BookOpen },
        { id: "reports" as TabType, name: "Reports", icon: Flag },
    ];

    // Settings tab for ADMIN+ only (not MODERATOR)
    const userRole = currentUser.role as string;
    const adminTabs = userRole !== "MODERATOR"
        ? [
            { id: "settings" as TabType, name: "Settings", icon: Settings },
            { id: "leaderboard" as TabType, name: "Leaderboard", icon: Trophy },
        ]
        : [];

    // Audit logs for SUPER_ADMIN only
    const superAdminTabs = isSuperAdmin(userRole)
        ? [
            { id: "audit" as TabType, name: "Audit Logs", icon: ScrollText },
            { id: "system" as TabType, name: "System", icon: Activity },
        ]
        : [];

    const tabs = [...baseTabs, ...adminTabs, ...superAdminTabs];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                                    <RoleBadge role={currentUser.role} />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Manage users, content, and platform settings
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Back to Site
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Platform Statistics</h2>
                            <AdminStatsCards />
                        </div>
                    </div>
                )}

                {activeTab === "users" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">User Management</h2>
                        </div>
                        <AdminUsersTable />
                    </div>
                )}

                {activeTab === "notes" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Content Moderation</h2>
                        </div>
                        <AdminNotesTable />
                    </div>
                )}

                {activeTab === "courses" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Course Management</h2>
                        </div>
                        <AdminCoursesTable />
                    </div>
                )}

                {activeTab === "settings" && userRole !== "MODERATOR" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Platform Settings</h2>
                        </div>
                        <AdminSettingsPanel />
                    </div>
                )}

                {activeTab === "reports" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Reports Queue</h2>
                        </div>
                        <AdminReportsQueue />
                    </div>
                )}

                {activeTab === "audit" && isSuperAdmin(userRole) && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Audit Logs</h2>
                        </div>
                        <AdminAuditLogs />
                    </div>
                )}

                {activeTab === "system" && isSuperAdmin(userRole) && (
                    <div className="space-y-4">
                        <AdminSystemHealth />
                    </div>
                )}

                {activeTab === "leaderboard" && userRole !== "MODERATOR" && (
                    <div className="space-y-4">
                        <AdminLeaderboardControl />
                    </div>
                )}
            </div>
        </div>
    );
}
