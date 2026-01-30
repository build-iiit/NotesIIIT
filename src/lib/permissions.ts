/**
 * Admin Panel - Permissions & RBAC System
 *
 * This module defines the role hierarchy and permission system for the admin panel.
 * All permission checks are server-side only.
 */

import { Role } from "@prisma/client";

// =============================================================================
// Role Hierarchy
// =============================================================================

/**
 * Role hierarchy from highest to lowest privilege:
 * SUPER_ADMIN > ADMIN > MODERATOR > USER
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    MODERATOR: 2,
    USER: 1,
};

/**
 * Check if a role has at least the specified minimum role level
 */
export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Check if user can promote/demote to a target role
 * A user can only assign roles lower than their own
 */
export function canAssignRole(userRole: Role, targetRole: Role): boolean {
    return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

// =============================================================================
// Permission Definitions
// =============================================================================

export type Permission =
    // User Management
    | "users.view"
    | "users.suspend"
    | "users.ban"
    | "users.delete"
    | "users.promote"
    | "users.viewActivity"
    // Content Moderation
    | "notes.view"
    | "notes.hide"
    | "notes.lock"
    | "notes.delete"
    | "notes.feature"
    | "notes.pin"
    | "notes.viewVersions"
    // Comments
    | "comments.moderate"
    | "comments.delete"
    // Reports
    | "reports.view"
    | "reports.resolve"
    // Platform Settings
    | "settings.view"
    | "settings.update"
    // Courses
    | "courses.manage"
    // Audit Logs
    | "audit.view"
    // System
    | "system.health";

/**
 * Permission matrix: maps each permission to the minimum roles that have it
 */
export const PERMISSION_MATRIX: Record<Permission, Role[]> = {
    // User Management
    "users.view": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "users.suspend": ["SUPER_ADMIN", "ADMIN"],
    "users.ban": ["SUPER_ADMIN", "ADMIN"],
    "users.delete": ["SUPER_ADMIN"],
    "users.promote": ["SUPER_ADMIN"],
    "users.viewActivity": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],

    // Content Moderation
    "notes.view": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "notes.hide": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "notes.lock": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "notes.delete": ["SUPER_ADMIN", "ADMIN"],
    "notes.feature": ["SUPER_ADMIN", "ADMIN"],
    "notes.pin": ["SUPER_ADMIN", "ADMIN"],
    "notes.viewVersions": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],

    // Comments
    "comments.moderate": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "comments.delete": ["SUPER_ADMIN", "ADMIN"],

    // Reports
    "reports.view": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
    "reports.resolve": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],

    // Platform Settings
    "settings.view": ["SUPER_ADMIN", "ADMIN"],
    "settings.update": ["SUPER_ADMIN", "ADMIN"],

    // Courses
    "courses.manage": ["SUPER_ADMIN", "ADMIN"],

    // Audit Logs
    "audit.view": ["SUPER_ADMIN"],

    // System
    "system.health": ["SUPER_ADMIN", "ADMIN"],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
    const allowedRoles = PERMISSION_MATRIX[permission];
    return allowedRoles.includes(userRole);
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: Role): Permission[] {
    return (Object.entries(PERMISSION_MATRIX) as [Permission, Role[]][])
        .filter(([, allowedRoles]) => allowedRoles.includes(role))
        .map(([permission]) => permission);
}

/**
 * Check if a role is an admin-level role (can access admin panel)
 */
export function isAdminRole(role: Role): boolean {
    return ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role);
}

// =============================================================================
// Types for Frontend Usage
// =============================================================================

/**
 * Safe user object with permissions info for frontend
 */
export interface AdminUserContext {
    id: string;
    email: string;
    role: Role;
    permissions: Permission[];
}

/**
 * Create an admin user context with resolved permissions
 */
export function createAdminUserContext(
    user: { id: string; email?: string | null; role: Role }
): AdminUserContext {
    return {
        id: user.id,
        email: user.email || "",
        role: user.role,
        permissions: getPermissionsForRole(user.role),
    };
}
