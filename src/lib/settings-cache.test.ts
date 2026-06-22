import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";

describe("Settings Cache Invalidation", () => {
    describe("invalidateSettingsCache", () => {
        beforeEach(async () => {
            const { invalidateSettingsCache } = await import("./settings-cache.ts");
            invalidateSettingsCache(); // Clear before each test
            mock.restoreAll();
        });

        it("should clear the entire cache when no key is provided", async () => {
            const { invalidateSettingsCache, getSetting } = await import("./settings-cache.ts");
            const { prisma } = await import("./prisma.ts");

            // Override prisma method directly with a mock function
            const mockFindUnique = mock.fn(async () => ({ value: "mocked-value" }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prisma.platformSetting.findUnique = mockFindUnique as any;

            // 1. Initial calls should hit DB and populate cache
            const val1 = await getSetting("key1", "default");
            const val2 = await getSetting("key2", "default");
            assert.strictEqual(val1, "mocked-value");
            assert.strictEqual(val2, "mocked-value");
            assert.strictEqual(mockFindUnique.mock.callCount(), 2);

            // 2. Subsequent calls should hit cache
            await getSetting("key1", "default");
            await getSetting("key2", "default");
            assert.strictEqual(mockFindUnique.mock.callCount(), 2, "Cache should have been hit, no new DB calls");

            // 3. Invalidate ALL cache
            invalidateSettingsCache();

            // 4. Calls after invalidation should hit DB again
            await getSetting("key1", "default");
            await getSetting("key2", "default");
            assert.strictEqual(mockFindUnique.mock.callCount(), 4, "DB should be hit twice more after clearing all cache");
        });

        it("should clear only the specific key when a key is provided", async () => {
            const { invalidateSettingsCache, getSetting } = await import("./settings-cache.ts");
            const { prisma } = await import("./prisma.ts");

            const mockFindUnique = mock.fn(async () => ({ value: "mocked-value" }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prisma.platformSetting.findUnique = mockFindUnique as any;

            // 1. Initial calls should hit DB and populate cache
            await getSetting("key1", "default");
            await getSetting("key2", "default");
            assert.strictEqual(mockFindUnique.mock.callCount(), 2);

            // 2. Subsequent calls should hit cache
            await getSetting("key1", "default");
            await getSetting("key2", "default");
            assert.strictEqual(mockFindUnique.mock.callCount(), 2);

            // 3. Invalidate ONLY specific key
            invalidateSettingsCache("key1");

            // 4. Third call: key1 should hit DB, key2 should hit cache
            await getSetting("key1", "default");
            await getSetting("key2", "default");
            assert.strictEqual(mockFindUnique.mock.callCount(), 3, "Only key1 should have been fetched from DB again");
        });
    });
});
