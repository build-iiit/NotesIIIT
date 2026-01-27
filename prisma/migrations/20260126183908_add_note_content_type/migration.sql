-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('PDF', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'GROUP');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "thumbnailS3Key" TEXT,
ADD COLUMN     "type" "NoteType" NOT NULL DEFAULT 'PDF',
ADD COLUMN     "visibility" "NoteVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "NoteVersion" ADD COLUMN     "content" TEXT,
ADD COLUMN     "thumbnailKey" TEXT,
ALTER COLUMN "s3Key" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundImage" TEXT;

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SharedNotes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SharedNotes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_userId_parentId_name_key" ON "Folder"("userId", "parentId", "name");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE INDEX "Bookmark_noteId_idx" ON "Bookmark"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_noteId_pageNumber_key" ON "Bookmark"("userId", "noteId", "pageNumber");

-- CreateIndex
CREATE INDEX "Annotation_pageId_idx" ON "Annotation"("pageId");

-- CreateIndex
CREATE INDEX "Annotation_userId_idx" ON "Annotation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Annotation_userId_pageId_key" ON "Annotation"("userId", "pageId");

-- CreateIndex
CREATE INDEX "FriendRequest_receiverId_idx" ON "FriendRequest"("receiverId");

-- CreateIndex
CREATE INDEX "FriendRequest_senderId_idx" ON "FriendRequest"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_senderId_receiverId_key" ON "FriendRequest"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Group_creatorId_idx" ON "Group"("creatorId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_userId_groupId_key" ON "GroupMember"("userId", "groupId");

-- CreateIndex
CREATE INDEX "_SharedNotes_B_index" ON "_SharedNotes"("B");

-- CreateIndex
CREATE INDEX "Note_folderId_idx" ON "Note"("folderId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedNotes" ADD CONSTRAINT "_SharedNotes_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedNotes" ADD CONSTRAINT "_SharedNotes_B_fkey" FOREIGN KEY ("B") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
