"use client";

import { api } from"@/app/_trpc/client";
import Link from"next/link";
import { useEffect, useState } from"react";
import { useInView } from"react-intersection-observer";
import { FileText } from"lucide-react";
import { Draggable } from"@/components/dnd/Draggable";
import { SaveToFiles } from'@/components/ui/SaveToFiles';
import { useSession } from"next-auth/react";

export function NotesFeed() {
 const { data: session } = useSession();
 const [sort, setSort] = useState<"newest" |"popular">("popular");
 const [displayCount, setDisplayCount] = useState(10);

 const { data, isLoading } = api.notes.getAll.useQuery({
 cursor: undefined,
 limit: 100
 });

 const { ref, inView } = useInView();

 useEffect(() => {
 if (inView && data?.items && displayCount < data.items.length) {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setDisplayCount(prev => prev + 10);
 }
 }, [inView, data?.items, displayCount]);

 const sortedNotes = (data?.items || []).sort((a: { voteScore?: number; createdAt: Date | string }, b: { voteScore?: number; createdAt: Date | string }) => {
 if (sort ==="popular") {
 return (b.voteScore || 0) - (a.voteScore || 0);
 } else {
 return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
 }
 });

 const allNotes = sortedNotes.slice(0, displayCount);

 if (isLoading) {
 return <div className="text-center py-10">Loading notes...</div>;
 }

 if (sortedNotes.length === 0 && !isLoading) {
 return (
 <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
 <p className="text-muted-foreground mb-4">No notes shared yet.</p>
 <Link href="/upload" className="text-primary hover:underline">
 Be the first to upload!
 </Link>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center mb-6">
 <div className="flex items-center gap-4">
 <h2 className="text-3xl font-black text-primary">
 {sort ==="popular" ?"Trending Uploads" :"Recent Uploads"}
 </h2>

 <div className="flex bg-secondary p-1 rounded-lg border border-border">
 <button
 onClick={() => setSort("popular")}
 className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${sort ==="popular"
 ?"bg-primary text-primary-foreground"
 :"text-muted-foreground hover:text-foreground"
 }`}
 >
 Trending
 </button>
 <button
 onClick={() => setSort("newest")}
 className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${sort ==="newest"
 ?"bg-primary text-primary-foreground"
 :"text-muted-foreground hover:text-foreground"
 }`}
 >
 Recent
 </button>
 </div>
 </div>
 <Link
 href="/upload"
 className="hidden sm:flex px-6 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 active:scale-95"
 >
 Upload Note
 </Link>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {allNotes.map((note) => (
 <Draggable key={note.id} id={note.id} data={{ type:"NOTE", note }}>
 <Link
 href={`/notes/${note.id}`}
 className="group block bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 flex flex-col h-full"
 >
 <div className="h-40 w-full relative overflow-hidden bg-secondary border-b border-border">
 {(note as any).thumbnailUrl ? (
 <img
 src={(note as any).thumbnailUrl}
 alt={`Thumbnail for ${note.title}`}
 className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-secondary">
 <FileText className="h-12 w-12 text-muted-foreground/30" />
 </div>
 )}

 {note.course && (
 <span className="absolute top-2 right-2 text-xs font-mono bg-foreground/80 text-background px-2 py-1 rounded">
 {note.course.code}
 </span>
 )}
 </div>

 <div className="p-5 flex-1 flex flex-col">
 <h3 className="font-bold text-lg mb-2 transition-colors line-clamp-1 group-hover:text-primary">
 {note.title}
 </h3>
 <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
 <span>By {(note as { author?: { name?: string } }).author?.name ||"Unknown"}</span>
 <span>•</span>
 <span>{new Date(note.createdAt).toLocaleDateString()}</span>
 </p>
 {note.description && (
 <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
 {note.description}
 </p>
 )}
 <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
 <span className="flex items-center gap-1 transition-colors group-hover:text-primary">
 Read Note &rarr;
 </span>
 {session?.user?.id && session.user.id !== note.authorId && (
 <div onClick={(e) => e.preventDefault()}>
 <SaveToFiles noteId={note.id} noteTitle={note.title} />
 </div>
 )}
 </div>
 </div>
 </Link>
 </Draggable>
 ))}
 </div>

 {displayCount < sortedNotes.length && (
 <div className="text-center py-4 text-muted-foreground">Loading more...</div>
 )}

 <div ref={ref} className="h-4" />
 </div>
 );
}