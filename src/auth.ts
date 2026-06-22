import NextAuth from"next-auth"
import GitHub from"next-auth/providers/github"
import Google from"next-auth/providers/google"
import Credentials from"next-auth/providers/credentials"
import { PrismaAdapter } from"@auth/prisma-adapter"
import { PrismaClient } from"@prisma/client"
import { getPresignedDownloadUrl } from"@/lib/storage"
import bcrypt from"bcryptjs"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 adapter: PrismaAdapter(prisma) as any,
 session: { strategy:"jwt" },
 providers: [
 GitHub,
 Google,
 Credentials({
 name:"Email & Password",
 credentials: {
 email: { label:"Email", type:"email" },
 password: { label:"Password", type:"password" },
 },
 async authorize(credentials) {
 if (!credentials?.email || !credentials?.password) return null;

 const user = await prisma.user.findUnique({
 where: { email: credentials.email as string },
 });

 if (!user?.password) return null;

 const valid = await bcrypt.compare(
 credentials.password as string,
 user.password
 );

 if (!valid) return null;

 return {
 id: user.id,
 name: user.name,
 email: user.email,
 image: user.image,
 role: user.role as"USER" |"ADMIN",
 };
 },
 }),
 ],
 pages: {
 signIn:"/login",
 },
 callbacks: {
 async session({ session, token }) {
 if (token.sub && session.user) {
 session.user.id = token.sub;
 session.user.role = token.role as"USER" |"ADMIN";

 // Resolve S3 URL for profile image if it's a key
 if (session.user.image && !session.user.image.startsWith("http")) {
 try {
 session.user.image = await getPresignedDownloadUrl(session.user.image);
 } catch (error) {
 console.error("Failed to resolve session image:", error);
 }
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
