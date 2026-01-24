"use server";

import { prisma } from "@/lib/prisma"; // We need to ensure lib/prisma exists
import { revalidatePath } from "next/cache";

export async function createNoteRecord(title: string, s3Key: string) {
    // const session = await auth();
    // if (!session?.user?.id) throw new Error("Unauthorized");
    const session = { user: { id: "debug-user-id" } };

    try {
        const note = await prisma.note.create({
            data: {
                title,
                authorId: session.user.id,
                versions: {
                    create: {
                        s3Key,
                        version: 1,
                    },
                },
                currentVersionId: "", // Will update this
            },
            include: {
                versions: true,
            },
        });

        // Update currentVersionId to the newly created version
        await prisma.note.update({
            where: { id: note.id },
            data: { currentVersionId: note.versions[0].id },
        });

        revalidatePath("/");
        return { success: true, noteId: note.id };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, error: "Failed to create note record" };
    }
}
