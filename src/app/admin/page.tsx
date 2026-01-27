"use client";

import { useState, useEffect } from "react";
import { api } from "@/app/_trpc/client";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminNotesTable } from "@/components/admin/AdminNotesTable";
import { AdminCoursesTable } from "@/components/admin/AdminCoursesTable";
import { AdminReportsTable } from "@/components/admin/AdminReportsTable";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, BookOpen, Shield, AlertCircle, Flag } from "lucide-react";
import { useRouter } from "next/navigation";

type TabType = "overview" | "users" | "notes" | "courses" | "reports";

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const router = useRouter();
    const { data: currentUser, isLoading } = api.auth.getMe.useQuery();

    // Redirect if not admin
    useEffect(() => {
        if (!isLoading && (!currentUser || currentUser.role !== "ADMIN")) {
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

    if (!currentUser || currentUser.role !== "ADMIN") {
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

    const tabs = [
        { id: "overview" as TabType, name: "Overview", icon: LayoutDashboard },
        { id: "users" as TabType, name: "Users", icon: Users },
        { id: "notes" as TabType, name: "Notes", icon: FileText },
        { id: "courses" as TabType, name: "Courses", icon: BookOpen },
        { id: "reports" as TabType, name: "Reports", icon: Flag },
    ];

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
                                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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

                {activeTab === "reports" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Content Reports</h2>
                        </div>
                        <AdminReportsTable />
                    </div>
                )}
            </div>
        </div>
    );
}
