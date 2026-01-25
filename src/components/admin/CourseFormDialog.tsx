"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { X } from "lucide-react";

interface CourseFormDialogProps {
    course?: {
        id: string;
        name: string;
        code: string;
        branch: string;
        description?: string | null;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export function CourseFormDialog({ course, onClose, onSuccess }: CourseFormDialogProps) {
    const [formData, setFormData] = useState({
        name: course?.name || "",
        code: course?.code || "",
        branch: course?.branch || "",
        description: course?.description || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = api.admin.createCourse.useMutation({
        onSuccess: () => {
            onSuccess();
        },
        onError: (error) => {
            setErrors({ general: error.message });
        },
    });

    const updateMutation = api.admin.updateCourse.useMutation({
        onSuccess: () => {
            onSuccess();
        },
        onError: (error) => {
            setErrors({ general: error.message });
        },
    });

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Course name is required";
        }
        if (!formData.code.trim()) {
            newErrors.code = "Course code is required";
        }
        if (!formData.branch.trim()) {
            newErrors.branch = "Branch is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (course) {
            updateMutation.mutate({
                id: course.id,
                ...formData,
            });
        } else {
            createMutation.mutate(formData);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-xl font-semibold">
                        {course ? "Edit Course" : "Create New Course"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.general && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {errors.general}
                        </div>
                    )}

                    {/* Course Code */}
                    <div>
                        <label htmlFor="code" className="block text-sm font-medium mb-1.5">
                            Course Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="code"
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="e.g., CS101"
                            className={`w-full px-3 py-2 border ${errors.code ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                                } rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                            disabled={isLoading}
                        />
                        {errors.code && (
                            <p className="mt-1 text-xs text-red-500">{errors.code}</p>
                        )}
                    </div>

                    {/* Course Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                            Course Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Introduction to Programming"
                            className={`w-full px-3 py-2 border ${errors.name ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                                } rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            disabled={isLoading}
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                        )}
                    </div>

                    {/* Branch */}
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium mb-1.5">
                            Branch <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="branch"
                            type="text"
                            value={formData.branch}
                            onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value.toUpperCase() }))}
                            placeholder="e.g., CSE, ECE, MTH"
                            className={`w-full px-3 py-2 border ${errors.branch ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                                } rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase`}
                            disabled={isLoading}
                        />
                        {errors.branch && (
                            <p className="mt-1 text-xs text-red-500">{errors.branch}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the course..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Saving..." : course ? "Update Course" : "Create Course"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
