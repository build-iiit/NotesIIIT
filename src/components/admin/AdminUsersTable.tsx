"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import Image from "next/image";
import { Shield, User, Trash2, Search } from "lucide-react";

export function AdminUsersTable() {
    const [search, setSearch] = useState("");
    const { data, isLoading, refetch } = api.admin.getAllUsers.useQuery({ search });
    const updateRoleMutation = api.admin.updateUserRole.useMutation({
        onSuccess: () => {
            refetch();
        },
    });
    const deleteUserMutation = api.admin.deleteUser.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleRoleToggle = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
        if (confirm(`Are you sure you want to ${newRole === "ADMIN" ? "promote" : "demote"} this user?`)) {
            try {
                await updateRoleMutation.mutateAsync({ userId, role: newRole });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to update role");
            }
        }
    };

    const handleDeleteUser = async (userId: string, userName: string | null) => {
        if (confirm(`Are you sure you want to delete ${userName || "this user"}? This action cannot be undone.`)) {
            try {
                await deleteUserMutation.mutateAsync({ userId });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to delete user");
            }
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            {/* Search Header */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Stats
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : data?.users && data.users.length > 0 ? (
                            data.users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                                alt={user.name || "User"}
                                                width={40}
                                                height={40}
                                                className="rounded-full"
                                            />
                                            <div>
                                                <div className="font-medium">{user.name || "Anonymous"}</div>
                                                <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.email || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === "ADMIN"
                                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                                    : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400"
                                                }`}
                                        >
                                            {user.role === "ADMIN" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="text-gray-900 dark:text-gray-100">
                                            {user._count.notes} notes • {user.karma} karma
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                                            {user.totalViews} views • {user._count.votes} votes
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRoleToggle(user.id, user.role)}
                                                disabled={updateRoleMutation.isPending}
                                                className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50"
                                            >
                                                {user.role === "ADMIN" ? "Demote" : "Promote"}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                disabled={deleteUserMutation.isPending}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
                                                title="Delete user"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
