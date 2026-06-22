"use client";

import { api } from"@/app/_trpc/client";
import Link from"next/link";
import { TrendingUp, Eye } from"lucide-react";

export function TrendingNotes() {
 const { data, isLoading } = api.notes.getAll.useQuery({ cursor: undefined, limit: 50 });

 const trendingNotes = (data?.items || [])
 .sort((a: { voteScore?: number }, b: { voteScore?: number }) => (b.voteScore || 0) - (a.voteScore || 0))
 .slice(0, 5);

 if (isLoading) {
 return (
 <div className="w-full max-w-6xl mb-12">
 <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse mb-6" />
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-48 bg-secondary rounded-xl animate-pulse" />
 ))}
 </div>
 </div>
 );
 }

 if (!trendingNotes || trendingNotes.length === 0) return null;

 return (
 <div className="w-full max-w-6xl mb-12">
 <div className="flex items-center gap-2 mb-6">
 <div className="p-2 rounded-lg bg-primary/10">
 <TrendingUp className="h-5 w-5 text-primary" />
 </div>
 <h2 className="text-2xl font-bold text-primary">
 Trending Uploads
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {trendingNotes.map((note) => (
 <Link
 key={note.id}
 href={`/notes/${note.id}`}
 className="group block bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/30"
 >
 <div className="relative h-40 w-full bg-secondary border-b border-border overflow-hidden">
 {(note as any).thumbnailUrl ? (
 <img
 src={(note as any).thumbnailUrl}
 alt={`Thumbnail for ${note.title}`}
 className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 ) : (
 <div className="flex items-center justify-center h-full text-muted-foreground/30">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 </div>
 )}
 </div>

 <div className="p-5 flex flex-col flex-1">
 <div className="flex justify-between items-start mb-2">
 <h3 className="font-bold text-lg transition-colors line-clamp-1 pr-4 group-hover:text-primary">
 {note.title}
 </h3>
 <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
 <Eye className="h-3 w-3" />
 {note.viewCount}
 </div>
 </div>

 <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
 <span>By {(note as { author?: { name?: string } }).author?.name ||"Unknown"}</span>
 <span>•</span>
 <span>{new Date(note.createdAt).toLocaleDateString()}</span>
 </p>

 {note.description && (
 <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
 {note.description}
 </p>
 )}

 <div className="mt-auto flex items-center text-xs text-muted-foreground pt-4 border-t border-border">
 <span className="flex items-center gap-1 transition-colors group-hover:text-primary">
 View details &rarr;
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 );
}
