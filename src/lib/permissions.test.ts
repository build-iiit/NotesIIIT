import { describe, it } from "node:test";
import assert from "node:assert";
import {
    hasMinimumRole,
    canAssignRole,
    hasPermission,
    getPermissionsForRole,
    isAdminRole,
    createAdminUserContext
} from "./permissions.ts";

describe("Permissions System", () => {
    describe("hasMinimumRole", () => {
        it("should return true if user role is higher than minimum role", () => {
            assert.strictEqual(hasMinimumRole("SUPER_ADMIN", "ADMIN"), true);
            assert.strictEqual(hasMinimumRole("ADMIN", "MODERATOR"), true);
            assert.strictEqual(hasMinimumRole("MODERATOR", "USER"), true);
        });

        it("should return true if user role is equal to minimum role", () => {
            assert.strictEqual(hasMinimumRole("SUPER_ADMIN", "SUPER_ADMIN"), true);
            assert.strictEqual(hasMinimumRole("ADMIN", "ADMIN"), true);
            assert.strictEqual(hasMinimumRole("MODERATOR", "MODERATOR"), true);
            assert.strictEqual(hasMinimumRole("USER", "USER"), true);
        });

        it("should return false if user role is lower than minimum role", () => {
            assert.strictEqual(hasMinimumRole("ADMIN", "SUPER_ADMIN"), false);
            assert.strictEqual(hasMinimumRole("MODERATOR", "ADMIN"), false);
            assert.strictEqual(hasMinimumRole("USER", "MODERATOR"), false);
        });
    });

    describe("canAssignRole", () => {
        it("should return true if user role is higher than target role", () => {
            assert.strictEqual(canAssignRole("SUPER_ADMIN", "ADMIN"), true);
            assert.strictEqual(canAssignRole("SUPER_ADMIN", "USER"), true);
            assert.strictEqual(canAssignRole("ADMIN", "MODERATOR"), true);
            assert.strictEqual(canAssignRole("MODERATOR", "USER"), true);
        });

        it("should return false if user role is equal to target role", () => {
            assert.strictEqual(canAssignRole("ADMIN", "ADMIN"), false);
            assert.strictEqual(canAssignRole("USER", "USER"), false);
        });

        it("should return false if user role is lower than target role", () => {
            assert.strictEqual(canAssignRole("ADMIN", "SUPER_ADMIN"), false);
            assert.strictEqual(canAssignRole("USER", "MODERATOR"), false);
        });
    });

    describe("hasPermission", () => {
        it("should return true if role has permission", () => {
            assert.strictEqual(hasPermission("SUPER_ADMIN", "users.delete"), true);
            assert.strictEqual(hasPermission("ADMIN", "users.suspend"), true);
            assert.strictEqual(hasPermission("MODERATOR", "notes.view"), true);
        });

        it("should return false if role does not have permission", () => {
            assert.strictEqual(hasPermission("ADMIN", "users.delete"), false);
            assert.strictEqual(hasPermission("MODERATOR", "users.ban"), false);
            assert.strictEqual(hasPermission("USER", "users.view"), false);
        });
    });

    describe("getPermissionsForRole", () => {
        it("should return all permissions for SUPER_ADMIN", () => {
            const permissions = getPermissionsForRole("SUPER_ADMIN");
            assert.ok(permissions.includes("users.delete"));
            assert.ok(permissions.includes("audit.view"));
            assert.ok(permissions.includes("system.health"));
        });

        it("should return restricted permissions for MODERATOR", () => {
            const permissions = getPermissionsForRole("MODERATOR");
            assert.ok(permissions.includes("users.view"));
            assert.ok(permissions.includes("notes.view"));
            assert.strictEqual(permissions.includes("users.delete"), false);
            assert.strictEqual(permissions.includes("audit.view"), false);
        });

        it("should return empty array for USER", () => {
            const permissions = getPermissionsForRole("USER");
            assert.strictEqual(permissions.length, 0);
        });
    });

    describe("isAdminRole", () => {
        it("should return true for admin-level roles", () => {
            assert.strictEqual(isAdminRole("SUPER_ADMIN"), true);
            assert.strictEqual(isAdminRole("ADMIN"), true);
            assert.strictEqual(isAdminRole("MODERATOR"), true);
        });

        it("should return false for non-admin roles", () => {
            assert.strictEqual(isAdminRole("USER"), false);
        });
    });

    describe("createAdminUserContext", () => {
        it("should create correct context for ADMIN", () => {
            const user = { id: "1", email: "admin@example.com", role: "ADMIN" as any };
            const context = createAdminUserContext(user);

            assert.strictEqual(context.id, "1");
            assert.strictEqual(context.email, "admin@example.com");
            assert.strictEqual(context.role, "ADMIN");
            assert.ok(Array.isArray(context.permissions));
            assert.ok(context.permissions.includes("users.suspend"));
        });

        it("should handle null email", () => {
            const user = { id: "2", email: null, role: "MODERATOR" as any };
            const context = createAdminUserContext(user);

            assert.strictEqual(context.email, "");
        });
    });
});
