import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { getPresignedUrl, getPresignedDownloadUrl } from "@/lib/s3"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [GitHub],
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.role = token.role as "USER" | "ADMIN";

                // Resolve S3 URL for profile image if it's a key
                if (session.user.image && !session.user.image.startsWith("http")) {
                    try {
                        console.log("Resolving session image for:", session.user.id, session.user.image);
                        session.user.image = await getPresignedDownloadUrl(session.user.image);
                        console.log("Resolved session image to:", session.user.image);
                    } catch (error) {
                        console.error("Failed to resolve session image:", error);
                        // Fallback: keep the original image string or set to null if preferred
                    }
                } else {
                    console.log("Session image already URL or null:", session.user.image);
                }
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
            }
            return token;
        }
    },
})
