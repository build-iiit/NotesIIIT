
import { prisma } from "../src/lib/prisma";

async function checkUser() {
    try {
        console.log("Fetching users...");
        const users = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        if (users.length === 0) {
            console.log("No users found.");
        } else {
            console.log("Latest Users:");
            users.forEach((u) => {
                console.log(`- ID: ${u.id}, Name: ${u.name}, Image: ${u.image}, Background: ${u.backgroundImage}`);
            });
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
