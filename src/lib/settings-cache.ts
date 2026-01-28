/**
 * Platform Settings Cache
 *
 * Provides cached access to platform-wide settings stored in the database.
 * Settings are cached in-memory with a configurable TTL for performance.
 */

import { prisma } from "@/lib/prisma";
import { SettingType } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface CachedSetting {
    value: unknown;
    expires: number;
}

interface SettingDefinition {
    key: string;
    defaultValue: unknown;
    type: SettingType;
    category: string;
    description: string;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const CACHE_TTL_MS = 60_000; // 1 minute
const settingsCache = new Map<string, CachedSetting>();

// =============================================================================
// Default Settings
// =============================================================================

export const DEFAULT_SETTINGS: SettingDefinition[] = [
    // Registration
    {
        key: "registration.enabled",
        defaultValue: true,
        type: "BOOLEAN",
        category: "registration",
        description: "Allow new user registrations",
    },

    // Uploads
    {
        key: "uploads.pdf.enabled",
        defaultValue: true,
        type: "BOOLEAN",
        category: "uploads",
        description: "Allow PDF note uploads",
    },
    {
        key: "uploads.markdown.enabled",
        defaultValue: true,
        type: "BOOLEAN",
        category: "uploads",
        description: "Allow Markdown note creation",
    },
    {
        key: "uploads.maxFileSizeMB",
        defaultValue: 50,
        type: "NUMBER",
        category: "uploads",
        description: "Maximum file size in MB",
    },
    {
        key: "uploads.maxPagesPerPDF",
        defaultValue: 500,
        type: "NUMBER",
        category: "uploads",
        description: "Maximum pages allowed per PDF",
    },

    // Voting
    {
        key: "voting.enabled",
        defaultValue: true,
        type: "BOOLEAN",
        category: "voting",
        description: "Enable voting on notes",
    },
    {
        key: "voting.dailyLimit",
        defaultValue: 100,
        type: "NUMBER",
        category: "voting",
        description: "Maximum votes per user per day",
    },

    // Comments
    {
        key: "comments.enabled",
        defaultValue: true,
        type: "BOOLEAN",
        category: "comments",
        description: "Enable comments on notes",
    },

    // Maintenance
    {
        key: "maintenance.enabled",
        defaultValue: false,
        type: "BOOLEAN",
        category: "maintenance",
        description: "Put platform in maintenance mode",
    },
    {
        key: "maintenance.message",
        defaultValue: "The platform is currently under maintenance. Please check back soon.",
        type: "STRING",
        category: "maintenance",
        description: "Message shown during maintenance",
    },

    // Features
    {
        key: "features.aiAssistant",
        defaultValue: true,
        type: "BOOLEAN",
        category: "features",
        description: "Enable AI assistant features",
    },
    {
        key: "features.requestBoard",
        defaultValue: true,
        type: "BOOLEAN",
        category: "features",
        description: "Enable request board",
    },
    {
        key: "features.social",
        defaultValue: true,
        type: "BOOLEAN",
        category: "features",
        description: "Enable social features (friends, groups)",
    },

    // Rate Limits
    {
        key: "limits.uploadsPerDay",
        defaultValue: 10,
        type: "NUMBER",
        category: "limits",
        description: "Maximum uploads per user per day",
    },
    {
        key: "limits.commentsPerHour",
        defaultValue: 50,
        type: "NUMBER",
        category: "limits",
        description: "Maximum comments per user per hour",
    },
];

// =============================================================================
// Cache Functions
// =============================================================================

/**
 * Get a setting value with caching
 * Falls back to default value if setting doesn't exist
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
    // Check cache first
    const cached = settingsCache.get(key);
    if (cached && cached.expires > Date.now()) {
        return cached.value as T;
    }

    // Fetch from database
    try {
        const setting = await prisma.platformSetting.findUnique({
            where: { key },
        });

        const value = setting?.value ?? defaultValue;

        // Update cache
        settingsCache.set(key, {
            value,
            expires: Date.now() + CACHE_TTL_MS,
        });

        return value as T;
    } catch {
        // On error, return default and don't cache
        return defaultValue;
    }
}

/**
 * Get multiple settings at once
 */
export async function getSettings(
    keys: string[]
): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};

    // Check which keys need fetching
    const keysToFetch: string[] = [];
    for (const key of keys) {
        const cached = settingsCache.get(key);
        if (cached && cached.expires > Date.now()) {
            results[key] = cached.value;
        } else {
            keysToFetch.push(key);
        }
    }

    // Batch fetch missing keys
    if (keysToFetch.length > 0) {
        const settings = await prisma.platformSetting.findMany({
            where: { key: { in: keysToFetch } },
        });

        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

        for (const key of keysToFetch) {
            const value = settingsMap.get(key);
            if (value !== undefined) {
                results[key] = value;
                settingsCache.set(key, {
                    value,
                    expires: Date.now() + CACHE_TTL_MS,
                });
            }
        }
    }

    return results;
}

/**
 * Invalidate cache for a specific key or all keys
 */
export function invalidateSettingsCache(key?: string): void {
    if (key) {
        settingsCache.delete(key);
    } else {
        settingsCache.clear();
    }
}

/**
 * Preload all settings into cache
 */
export async function preloadSettingsCache(): Promise<void> {
    const settings = await prisma.platformSetting.findMany();
    const expires = Date.now() + CACHE_TTL_MS;

    for (const setting of settings) {
        settingsCache.set(setting.key, {
            value: setting.value,
            expires,
        });
    }
}

/**
 * Seed default settings if they don't exist
 */
export async function seedDefaultSettings(): Promise<void> {
    for (const setting of DEFAULT_SETTINGS) {
        await prisma.platformSetting.upsert({
            where: { key: setting.key },
            update: {}, // Don't update existing settings
            create: {
                key: setting.key,
                value: setting.defaultValue as never,
                type: setting.type,
                category: setting.category,
                description: setting.description,
            },
        });
    }
}

// =============================================================================
// Helper Functions for Common Settings
// =============================================================================

export async function isMaintenanceMode(): Promise<boolean> {
    return getSetting("maintenance.enabled", false);
}

export async function isRegistrationEnabled(): Promise<boolean> {
    return getSetting("registration.enabled", true);
}

export async function isPdfUploadEnabled(): Promise<boolean> {
    return getSetting("uploads.pdf.enabled", true);
}

export async function isMarkdownEnabled(): Promise<boolean> {
    return getSetting("uploads.markdown.enabled", true);
}

export async function isVotingEnabled(): Promise<boolean> {
    return getSetting("voting.enabled", true);
}

export async function areCommentsEnabled(): Promise<boolean> {
    return getSetting("comments.enabled", true);
}

export async function getMaxFileSizeMB(): Promise<number> {
    return getSetting("uploads.maxFileSizeMB", 50);
}

export async function getDailyVoteLimit(): Promise<number> {
    return getSetting("voting.dailyLimit", 100);
}
