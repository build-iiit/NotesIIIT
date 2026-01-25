import { auth, signOut } from "@/auth";
import { Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { NotesFeed } from "@/components/NotesFeed";
import { prisma as db } from "@/lib/prisma";
import { HomeFolderGrid } from "@/components/HomeFolderGrid";
import { TrendingNotes } from "@/components/TrendingNotes";

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
      {session?.user ? (
        <div className="flex flex-col items-center gap-8 w-full z-10">
          <div className="flex flex-col items-center gap-4 mb-4 text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
              Welcome, {session.user.name?.split(" ")[0]}!
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-300 italic max-w-lg">
              &quot;{[
                "Notes so good, you might actually pass.",
                "Study smarter, not... well, just study.",
                "Your GPA called, it needs these notes.",
                "Because re-watching the lecture at 2x speed isn't enough.",
                "Sharing is caring (and improves your karma).",
                "The night before the exam is a pathway to many abilities some consider to be unnatural.",
                "Knowledge is power. Notes are the battery.",
                "Don't panic. Just read the notes."
              ][Math.floor(Math.random() * 8)]}&quot;
            </p>
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
