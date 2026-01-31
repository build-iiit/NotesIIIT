
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixUserImages() {
    console.log("🚀 Starting user image path check/repair...");

    // Find users with old style image paths (starting with /uploads/)
    const usersToFix = await prisma.user.findMany({
        where: {
            OR: [
                { image: { startsWith: "/uploads/" } },
                { backgroundImage: { startsWith: "/uploads/" } }
            ]
        },
        select: {
            id: true,
            name: true,
            image: true,
            backgroundImage: true
        }
    });

    console.log(`📊 Found ${usersToFix.length} users to repair`);

    let updated = 0;
    let errors = 0;

    for (const user of usersToFix) {
        const updateData: any = {};

        // Fix profile image
        if (user.image && user.image.startsWith("/uploads/")) {
            // Profile images are images, so they went to "thumbnails/" during migration
            // assuming they were detected as images (extensions .jpg, .png etc)
            const filename = user.image.replace("/uploads/", "");

            // Check extension
            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(filename);
            const prefix = isImage ? "thumbnails/" : "uploads/";

            const newKey = `${prefix}${filename}`;
            console.log(`👤 Fixing Image for ${user.name}:`);
            console.log(`   Old: ${user.image}`);
            console.log(`   New: ${newKey}`);
            updateData.image = newKey;
        }

        // Fix background image
        if (user.backgroundImage && user.backgroundImage.startsWith("/uploads/")) {
            const filename = user.backgroundImage.replace("/uploads/", "");
            // Check extension
            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(filename);
            const prefix = isImage ? "thumbnails/" : "uploads/";

            const newKey = `${prefix}${filename}`;
            console.log(`🖼️  Fixing Background for ${user.name}:`);
            console.log(`   Old: ${user.backgroundImage}`);
            console.log(`   New: ${newKey}`);
            updateData.backgroundImage = newKey;
        }

        if (Object.keys(updateData).length > 0) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
                updated++;
            } catch (error) {
                console.error(`❌ Failed to update user ${user.id}:`, error);
                errors++;
            }
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ User Repair Complete!");
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log("=".repeat(50));
}

fixUserImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
