import { auth, signOut } from "@/auth";
import { Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { NotesFeed } from "@/components/NotesFeed";
import { prisma as db } from "@/lib/prisma";
import { HomeFolderGrid } from "@/components/HomeFolderGrid";
import { HomeGroupsGrid } from "@/components/HomeGroupsGrid";
import { TrendingNotes } from "@/components/TrendingNotes";
import { DashboardDndWrapper } from "@/components/dnd/DashboardDndWrapper";
import { RandomQuote } from "@/components/RandomQuote";

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

  // Fetch user's groups if logged in
  const userGroups = session?.user?.id
    ? await db.group.findMany({
      where: {
        members: {
          some: { userId: session.user.id }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        _count: {
          select: { members: true }
        },
        members: {
          take: 4,
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    })
    : [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 relative overflow-hidden">
      {session?.user ? (
        <div className="flex flex-col items-center gap-8 w-full z-10">
          <div className="flex flex-col items-center gap-4 mb-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
              Welcome, {session.user.name?.split(" ")[0]}!
            </h1>

            <div className="min-h-[2rem] flex justify-center">
              <RandomQuote />
            </div>
          </div>

          {/* Folder Grid */}
          {userFolders.length > 0 && (
            <div className="w-full max-w-6xl mb-8">
              <HomeFolderGrid folders={userFolders} />
            </div>
          )}

          {/* Groups Grid */}
          <div className="w-full max-w-6xl mb-8">
            <HomeGroupsGrid />
          </div>

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
