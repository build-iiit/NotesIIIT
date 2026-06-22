
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkKeys() {
    const notes = await prisma.note.findMany({
        take: 10,
        select: {
            id: true,
            title: true,
            thumbnailS3Key: true,
            versions: {
                select: {
                    s3Key: true
                }
            }
        }
    });

    console.log("Checking database keys:");
    notes.forEach(n => {
        console.log(`Note: ${n.title}`);
        console.log(`  Thumbnail Key: ${n.thumbnailS3Key}`);
        console.log(`  PDF Keys: ${n.versions.map(v => v.s3Key).join(", ")}`);
        console.log("---");
    });
}

checkKeys()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
