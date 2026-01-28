"use client";

import { api } from "@/app/_trpc/client";
import { useState } from "react";
import {
    Settings,
    Save,
    Loader2,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Hash,
    Type,
    ChevronDown,
    ChevronRight,
    AlertCircle
} from "lucide-react";

interface SettingItem {
    id: string;
    key: string;
    value: unknown;
    type: string;
    description: string | null;
    updatedAt: Date;
}

type GroupedSettings = Record<string, SettingItem[]>;

export function AdminSettingsPanel() {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["general", "features"]));
    const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
    const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

    const { data: settings, isLoading, refetch } = api.settings.getAll.useQuery();
    const { data: categories } = api.settings.getCategories.useQuery();

    const updateMutation = api.settings.update.useMutation({
        onSuccess: (_, variables) => {
            refetch();
            // Remove from pending changes
            setPendingChanges(prev => {
                const next = { ...prev };
                delete next[variables.key];
                return next;
            });
            setSavingKeys(prev => {
                const next = new Set(prev);
                next.delete(variables.key);
                return next;
            });
        },
        onError: (error, variables) => {
            setSavingKeys(prev => {
                const next = new Set(prev);
                next.delete(variables.key);
                return next;
            });
            alert(`Failed to update setting: ${error.message}`);
        },
    });

    const seedMutation = api.settings.seedDefaults.useMutation({
        onSuccess: () => {
            refetch();
            alert("Default settings seeded successfully!");
        },
    });

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const handleValueChange = (key: string, value: unknown) => {
        setPendingChanges(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (key: string) => {
        const value = pendingChanges[key];
        if (value === undefined) return;

        setSavingKeys(prev => new Set(prev).add(key));
        await updateMutation.mutateAsync({ key, value });
    };

    const getDisplayValue = (setting: SettingItem): unknown => {
        return pendingChanges[setting.key] !== undefined
            ? pendingChanges[setting.key]
            : setting.value;
    };

    const hasChanges = (key: string) => pendingChanges[key] !== undefined;

    const renderSettingInput = (setting: SettingItem) => {
        const value = getDisplayValue(setting);
        const isSaving = savingKeys.has(setting.key);
        const changed = hasChanges(setting.key);

        switch (setting.type) {
            case "BOOLEAN":
                return (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleValueChange(setting.key, !value)}
                            className={`relative w-14 h-7 rounded-full transition-colors ${value
                                    ? "bg-green-500"
                                    : "bg-gray-300 dark:bg-zinc-600"
                                }`}
                            disabled={isSaving}
                        >
                            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-8" : "left-1"
                                }`} />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {value ? "Enabled" : "Disabled"}
                        </span>
                        {changed && (
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={isSaving}
                                className="ml-2 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                            </button>
                        )}
                    </div>
                );

            case "NUMBER":
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={value as number}
                            onChange={(e) => handleValueChange(setting.key, parseInt(e.target.value) || 0)}
                            className="w-32 px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
                            disabled={isSaving}
                        />
                        {changed && (
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={isSaving}
                                className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        )}
                    </div>
                );

            case "STRING":
            default:
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={value as string}
                            onChange={(e) => handleValueChange(setting.key, e.target.value)}
                            className="flex-1 max-w-md px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
                            disabled={isSaving}
                        />
                        {changed && (
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={isSaving}
                                className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        )}
                    </div>
                );
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "BOOLEAN":
                return <ToggleRight className="w-4 h-4 text-green-500" />;
            case "NUMBER":
                return <Hash className="w-4 h-4 text-blue-500" />;
            default:
                return <Type className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatCategoryName = (category: string) => {
        return category
            .split(".")
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" → ");
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-12">
                <div className="flex items-center justify-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading settings...
                </div>
            </div>
        );
    }

    // Check if settings are empty
    const isEmpty = !settings || Object.keys(settings).length === 0;

    if (isEmpty) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-8">
                <div className="text-center max-w-md mx-auto">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Settings Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Platform settings haven&apos;t been initialized yet. Click below to seed the default settings.
                    </p>
                    <button
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                        {seedMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Settings className="w-5 h-5" />
                        )}
                        Initialize Default Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with refresh button */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {categories?.length || 0} categories • Changes are saved individually
                </p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Settings grouped by category */}
            <div className="space-y-4">
                {Object.entries(settings as GroupedSettings).map(([category, categorySettings]) => (
                    <div
                        key={category}
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
                    >
                        {/* Category header */}
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5 text-gray-400" />
                                <span className="font-medium">{formatCategoryName(category)}</span>
                                <span className="text-sm text-gray-500">
                                    ({categorySettings.length} settings)
                                </span>
                            </div>
                            {expandedCategories.has(category) ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                        </button>

                        {/* Category settings */}
                        {expandedCategories.has(category) && (
                            <div className="border-t border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
                                {categorySettings.map((setting) => (
                                    <div key={setting.id} className="px-6 py-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getTypeIcon(setting.type)}
                                                    <span className="font-medium text-sm">
                                                        {setting.key.split(".").pop()}
                                                    </span>
                                                    <code className="text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                        {setting.key}
                                                    </code>
                                                </div>
                                                {setting.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {setting.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                {renderSettingInput(setting)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
