"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { BookOpen, Edit2, Trash2, Plus, Upload, Search, Filter } from "lucide-react";
import { CourseFormDialog } from "./CourseFormDialog";
import { BulkCourseImportDialog } from "./BulkCourseImportDialog";

export function AdminCoursesTable() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<{ id: string; name: string; code: string; branch: string; description?: string | null } | null>(null);
    const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
    const [deleteNotes, setDeleteNotes] = useState(false);

    const { data, isLoading, refetch } = api.admin.getAllCourses.useQuery({
        search: searchQuery || undefined,
        branch: selectedBranch,
        limit: 100,
    });

    const { data: branches } = api.course.getBranches.useQuery();

    const deleteMutation = api.admin.deleteCourse.useMutation({
        onSuccess: () => {
            void refetch();
            setDeletingCourseId(null);
            setDeleteNotes(false);
        },
        onError: (error) => {
            alert(`Failed to delete course: ${error.message}`);
        },
    });

    const bulkDeleteMutation = api.admin.deleteCourse.useMutation({
        onSuccess: () => {
            void refetch();
            setSelectedCourses([]);
        },
    });

    const handleDelete = (courseId: string) => {
        if (confirm("Are you sure you want to delete this course?")) {
            setDeletingCourseId(courseId);
        }
    };

    const confirmDelete = () => {
        if (deletingCourseId) {
            deleteMutation.mutate({ id: deletingCourseId, deleteNotes });
        }
    };

    const handleBulkDelete = () => {
        if (selectedCourses.length === 0) return;

        if (confirm(`Delete ${selectedCourses.length} selected course(s)?`)) {
            // Delete courses one by one
            Promise.all(selectedCourses.map(id =>
                bulkDeleteMutation.mutateAsync({ id, deleteNotes: false })
            )).then(() => {
                void refetch();
                setSelectedCourses([]);
            }).catch(error => {
                alert(`Failed to delete courses: ${error}`);
            });
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const toggleAllCourses = () => {
        if (selectedCourses.length === (data?.courses.length || 0)) {
            setSelectedCourses([]);
        } else {
            setSelectedCourses(data?.courses.map(c => c.id) || []);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const courses = data?.courses || [];

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-1 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Branch Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={selectedBranch || ""}
                            onChange={(e) => setSelectedBranch(e.target.value || undefined)}
                            className="pl-10 pr-8 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">All Branches</option>
                            {branches?.map((branch) => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    {selectedCourses.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedCourses.length})
                        </button>
                    )}
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Course
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedCourses.length === courses.length && courses.length > 0}
                                        onChange={toggleAllCourses}
                                        className="rounded border-gray-300 dark:border-zinc-600"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Branch
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Notes
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No courses found</p>
                                        <p className="text-sm">Create your first course to get started</p>
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(course.id)}
                                                onChange={() => toggleCourseSelection(course.id)}
                                                className="rounded border-gray-300 dark:border-zinc-600"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-medium">
                                            {course.code}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium">{course.name}</div>
                                            {course.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                                    {course.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                                {course.branch}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {course._count.notes}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingCourse(course)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Dialog */}
            {(isCreateOpen || editingCourse) && (
                <CourseFormDialog
                    course={editingCourse || undefined}
                    onClose={() => {
                        setIsCreateOpen(false);
                        setEditingCourse(null);
                    }}
                    onSuccess={() => {
                        void refetch();
                        setIsCreateOpen(false);
                        setEditingCourse(null);
                    }}
                />
            )}

            {/* Import Dialog */}
            {isImportOpen && (
                <BulkCourseImportDialog
                    onClose={() => setIsImportOpen(false)}
                    onSuccess={() => {
                        void refetch();
                        setIsImportOpen(false);
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deletingCourseId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Delete Course</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Are you sure you want to delete this course?
                        </p>
                        <div className="mb-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deleteNotes}
                                    onChange={(e) => setDeleteNotes(e.target.checked)}
                                    className="rounded border-gray-300 dark:border-zinc-600"
                                />
                                <span className="text-gray-700 dark:text-gray-300">
                                    Also delete all associated notes
                                </span>
                            </label>
                            {deleteNotes && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-2 ml-6">
                                    ⚠️ This action cannot be undone!
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setDeletingCourseId(null);
                                    setDeleteNotes(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
