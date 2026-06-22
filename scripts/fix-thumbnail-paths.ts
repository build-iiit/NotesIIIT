
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixThumbnailPaths() {
    console.log("🚀 Starting thumbnail path repair...");

    // Find notes with old style thumbnail paths (starting with /uploads/)
    const notesToFix = await prisma.note.findMany({
        where: {
            thumbnailS3Key: {
                startsWith: "/uploads/"
            }
        },
        select: {
            id: true,
            title: true,
            thumbnailS3Key: true
        }
    });

    console.log(`📊 Found ${notesToFix.length} notes to repair`);

    let updated = 0;
    let errors = 0;

    for (const note of notesToFix) {
        if (!note.thumbnailS3Key) continue;

        // Convert "/uploads/filename.jpg" -> "thumbnails/filename.jpg"
        const filename = note.thumbnailS3Key.replace("/uploads/", "");
        const newKey = `thumbnails/${filename}`;

        try {
            console.log(`🔧 Fixing: ${note.title}`);
            console.log(`   Old: ${note.thumbnailS3Key}`);
            console.log(`   New: ${newKey}`);

            await prisma.note.update({
                where: { id: note.id },
                data: { thumbnailS3Key: newKey }
            });

            updated++;
        } catch (error) {
            console.error(`❌ Failed to update note ${note.id}:`, error);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Repair Complete!");
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log("=".repeat(50));
}

fixThumbnailPaths()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
