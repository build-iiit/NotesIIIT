
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();

async function main() {
    const userId = "cmks1jqjr0000nhlqsmw1xznf"; // Extracted from user logs
    console.log(`Checking API key for user: ${userId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true, name: true }
    });

    if (!user) {
        console.error("User not found!");
        return;
    }

    if (!user.geminiApiKey) {
        console.error("User has no API key set in DB.");
        return;
    }

    console.log(`Found API Key: ${user.geminiApiKey.substring(0, 8)}... (Length: ${user.geminiApiKey.length})`);

    try {
        console.log("Listing available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${user.geminiApiKey}`);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        const models = (data.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => m.name);

        console.log("SUCCESS! Available models:", models);
    } catch (error: any) {
        console.error("FAILURE! Error:", error.message);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
