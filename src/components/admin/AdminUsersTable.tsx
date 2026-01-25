"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import Image from "next/image";
import { Shield, User, Trash2, Search, CheckSquare, Square } from "lucide-react";
import { ProfileImage } from "../ProfileImage";



export function AdminUsersTable() {
    const [search, setSearch] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const { data, isLoading, refetch } = api.admin.getAllUsers.useQuery({ search });

    // Mutations
    const updateRoleMutation = api.admin.updateUserRole.useMutation({
        onSuccess: () => refetch(),
    });

    const deleteUserMutation = api.admin.deleteUser.useMutation({
        onSuccess: () => refetch(),
    });

    const bulkDeleteMutation = api.admin.bulkDeleteUsers.useMutation({
        onSuccess: () => {
            refetch();
            setSelectedUsers([]);
        },
    });

    const bulkRoleMutation = api.admin.bulkUpdateUserRoles.useMutation({
        onSuccess: () => {
            refetch();
            setSelectedUsers([]);
        },
    });

    // Individual Actions
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

    // Bulk Actions
    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleAllUsers = () => {
        if (!data?.users) return;
        if (selectedUsers.length === data.users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(data.users.map(u => u.id));
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
            try {
                await bulkDeleteMutation.mutateAsync({ userIds: selectedUsers });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to delete users");
            }
        }
    };

    const handleBulkRoleUpdate = async (role: "ADMIN" | "USER") => {
        const action = role === "ADMIN" ? "promote" : "demote";
        if (confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) {
            try {
                await bulkRoleMutation.mutateAsync({ userIds: selectedUsers, role });
            } catch (error) {
                alert(error instanceof Error ? error.message : "Failed to update roles");
            }
        }
    };

    const isBulkLoading = bulkDeleteMutation.isPending || bulkRoleMutation.isPending;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            {/* Search and Toolbar */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                            <button
                                onClick={() => handleBulkRoleUpdate("ADMIN")}
                                disabled={isBulkLoading}
                                className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                Make Admin
                            </button>
                            <button
                                onClick={() => handleBulkRoleUpdate("USER")}
                                disabled={isBulkLoading}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <User className="w-4 h-4" />
                                Make User
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkLoading}
                                className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete ({selectedUsers.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left w-10">
                                <button
                                    onClick={toggleAllUsers}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {data?.users && data.users.length > 0 && selectedUsers.length === data.users.length ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : data?.users && data.users.length > 0 ? (
                            data.users.map((user) => (
                                <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${selectedUsers.includes(user.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleUserSelection(user.id)}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {selectedUsers.includes(user.id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <ProfileImage
                                                src={null}
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
