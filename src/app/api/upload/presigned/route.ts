import { getPresignedUrl } from "@/lib/s3";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
    // const session = await auth();
    // if (!session?.user) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    // Mock session for debug
    const session = { user: { id: "debug-user-id" } };

    try {
        const { filename, contentType } = await req.json();

        // Create unique key: user-id/uuid-filename.pdf
        const key = `${session.user.id}/${uuidv4()}-${filename}`;

        const url = await getPresignedUrl(key, contentType);

        return NextResponse.json({ url, key });
    } catch (error) {
        console.error("Presigned URL Error:", error);
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
    }
}
