import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Promote a user to SUPER_ADMIN role
 * This is a one-time setup endpoint for the first admin
 * 
 * Usage: 
 * - GET /api/seed/admin - Promotes the first created user to SUPER_ADMIN
 * - POST /api/seed/admin { email: "..." } - Promotes a specific user by email
 * 
 * IMPORTANT: This endpoint should be secured or removed in production
 */
export async function GET() {
    try {
        // Find the first created user
        const firstUser = await prisma.user.findFirst({
            orderBy: { createdAt: "asc" },
        });

        if (!firstUser) {
            return NextResponse.json(
                { success: false, error: "No users found" },
                { status: 404 }
            );
        }

        // Check if already SUPER_ADMIN
        if (firstUser.role === "SUPER_ADMIN") {
            return NextResponse.json({
                success: true,
                message: `User ${firstUser.email} is already SUPER_ADMIN`,
                user: {
                    id: firstUser.id,
                    email: firstUser.email,
                    name: firstUser.name,
                    role: firstUser.role,
                },
            });
        }

        // Promote to SUPER_ADMIN
        const updated = await prisma.user.update({
            where: { id: firstUser.id },
            data: { role: "SUPER_ADMIN" },
        });

        return NextResponse.json({
            success: true,
            message: `Successfully promoted ${updated.email} to SUPER_ADMIN`,
            user: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: "Email is required" },
                { status: 400 }
            );
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: `User with email ${email} not found` },
                { status: 404 }
            );
        }

        // Check if already SUPER_ADMIN
        if (user.role === "SUPER_ADMIN") {
            return NextResponse.json({
                success: true,
                message: `User ${user.email} is already SUPER_ADMIN`,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            });
        }

        // Promote to SUPER_ADMIN
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: "SUPER_ADMIN" },
        });

        return NextResponse.json({
            success: true,
            message: `Successfully promoted ${updated.email} to SUPER_ADMIN`,
            user: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
