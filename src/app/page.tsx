import { auth, signOut } from "@/auth";
import { Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { NotesFeed } from "@/components/NotesFeed";
import { prisma as db } from "@/lib/prisma";
import { HomeFolderGrid } from "@/components/HomeFolderGrid";

export default async function Home() {
  const session = await auth();

  // Fetch user's folders if logged in
  const userFolders = session?.user?.id
    ? await db.folder.findMany({
      where: { userId: session.user.id, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        userId: true,
        _count: {
          select: { notes: true }
        }
      }
    })
    : [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      {session?.user ? (
        <div className="flex flex-col items-center gap-8 w-full z-10">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(" ")[0]}!</h1>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 relative px-4 py-2 rounded-full backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] cursor-pointer">
                  Sign Out
                </button>
              </form>
            </div>
            <div className="flex gap-4">
              <a href="/leaderboard" className="text-blue-600 hover:underline">View Leaderboard</a>
              <span className="text-gray-300">|</span>
              <a href={`/users/${session.user.id}`} className="text-blue-600 hover:underline">Your Profile</a>
            </div>
            <p className="text-gray-500 mt-2">Pick up where you left off</p>
          </div>

          {/* Folder Grid */}
          {userFolders.length > 0 && (
            <div className="w-full max-w-6xl mb-8">
              <HomeFolderGrid folders={userFolders} />
            </div>
          )}

          {/* Notes Feed */}
          <div className="w-full max-w-6xl">
            <Suspense fallback={<div className="text-center">Loading feed...</div>}>
              <NotesFeed />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="z-10 w-full">
          <HeroSection />
        </div>
      )}
    </div>
  );
}
