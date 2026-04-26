import { auth } from "@/auth";
import { Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { NotesFeed } from "@/components/NotesFeed";
import { prisma as db } from "@/lib/prisma";
import { HomeFolderGrid } from "@/components/HomeFolderGrid";
import { HomeGroupsGrid } from "@/components/HomeGroupsGrid";
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
    <div className="flex flex-col w-full max-w-5xl mx-auto py-8 relative">
      {session?.user ? (
        <div className="flex flex-col gap-12 w-full">
          <div className="flex flex-col items-start gap-2 border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome, {session.user.name?.split(" ")[0]}
            </h1>
            <div className="text-muted-foreground text-sm">
              <RandomQuote />
            </div>
          </div>

          {/* Folder Grid */}
          {userFolders.length > 0 && (
            <div className="w-full">
              <HomeFolderGrid folders={userFolders} />
            </div>
          )}

          {/* Groups Grid */}
          <div className="w-full">
            <HomeGroupsGrid />
          </div>

          {/* Notes Feed */}
          <div className="w-full">
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading feed...</div>}>
              <NotesFeed />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <HeroSection />
        </div>
      )}
    </div>
  );
}
