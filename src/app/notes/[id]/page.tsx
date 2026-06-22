"use client";

import { use, useState, useEffect, useCallback } from"react";
import { api } from"@/app/_trpc/client";
import { InteractionsPanel } from"@/components/features/InteractionsPanel";
import Link from"next/link";
import dynamic from"next/dynamic";
import { Maximize2, Eye } from"lucide-react";
import { ReportButton } from"@/components/ui/ReportButton";
import { toast } from"sonner";

// Dynamically import PDF components with SSR disabled to avoid"DOMMatrix is not defined" error
const PdfViewer = dynamic(() => import("@/components/features/PdfViewer").then(mod => mod.PdfViewer), {
 ssr: false,
 loading: () => <div className="animate-pulse h-[600px] bg-gray-100 dark:bg-zinc-800 rounded-xl" />
});

const FullPageNoteViewer = dynamic(() => import("@/components/features/FullPageNoteViewer").then(mod => mod.FullPageNoteViewer), {
 ssr: false
});

import { useRouter, useSearchParams } from"next/navigation";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = use(params);
 const router = useRouter();
 const [note] = api.notes.getById.useSuspenseQuery({ id });
 const { data: currentUser } = api.auth.getMe.useQuery();

 const searchParams = useSearchParams();
 const pageParam = searchParams?.get("page");
 const initialPage = pageParam ? parseInt(pageParam) : 1;
 const [pageNum, setPageNum] = useState(initialPage);

 // Update page number when URL param changes
 useEffect(() => {
 const pageParam = searchParams?.get("page");
 if (pageParam) {
 setPageNum(parseInt(pageParam));
 }
 }, [searchParams]);

 const [isFullPageOpen, setIsFullPageOpen] = useState(false);
 const trackViewMutation = api.notes.trackView.useMutation();
 const [getPageImage, setGetPageImage] = useState<(() => string | null) | undefined>();

 // Callback to receive the canvas image capture function from PdfViewer
 const handleCanvasReady = useCallback((getImageFn: () => string | null) => {
 setGetPageImage(() => getImageFn);
 }, []);

 // Redirect markdown notes to proper route
 useEffect(() => {
 if (note?.noteType ==="MARKDOWN") {
 router.replace(`/markdown/${id}`);
 }
 }, [note?.noteType, id, router]);

 // Track view when the note is loaded
 useEffect(() => {
 if (note?.id && note?.noteType !=="MARKDOWN") {
 // Track view in background without updating the UI immediately
 // The updated count will show on next page load
 trackViewMutation.mutate({ noteId: note.id });
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [note?.id, note?.noteType]); // Only track on initial load

 if (!note) return <div>Note not found</div>;

 // Show loading while redirecting markdown notes
 if (note.noteType ==="MARKDOWN") {
 return <div className="min-h-screen flex items-center justify-center">Redirecting to editor...</div>;
 }

 // Find current version
 const currentVersion = note.versions.find(v => v.id === note.currentVersionId) || note.versions[0];
 const s3Url = note.fileUrl; // Use presigned URL from API

 return (
 <>
 <div className="min-h-screen p-8 flex flex-col items-center">
 <div className="w-full max-w-7xl">
 <div className="mb-6 flex justify-between items-start">
 <div>
 <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back</button>
 <h1 className="text-3xl font-bold">{note.title}</h1>
 <p className="text-gray-500 flex items-center gap-2">
 <span>By {note.author.name} • Version {currentVersion?.version}</span>
 <span className="flex items-center gap-1">
 • <Eye className="w-4 h-4" /> {note.viewCount}
 </span>
 </p>
 {note.description && <p className="mt-2 text-lg">{note.description}</p>}
 </div>
 <div className="flex items-center gap-2">
 {/* Download PDF */}
 {s3Url && (
 <a
 href={s3Url}
 download={`${note.title}.pdf`}
 className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-accent transition-all duration-200 border border-border"
 onClick={(e) => {
 if (!currentUser) {
 e.preventDefault();
 toast.info("Please sign in to download PDFs");
 }
 }}
 >
 Download
 </a>
 )}
 {/* Share */}
 {currentUser && (
 <button
 onClick={() => {
 const url = window.location.href;
 if (navigator.share) {
 navigator.share({ title: note.title, url });
 } else {
 navigator.clipboard.writeText(url);
 toast.success("Link copied to clipboard");
 }
 }}
 className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-accent transition-all duration-200 border border-border"
 >
 Share
 </button>
 )}
 <ReportButton noteId={note.id} isAuthor={currentUser?.id === note.authorId} />
 {currentUser?.id === note.authorId && (
 <Link href={`/notes/${note.id}/edit`} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200">
 Edit Note
 </Link>
 )}
 </div>
 </div>

 {/* Focus Mode Button - Desktop Only */}
 {s3Url && (
 <div className="hidden md:flex justify-end mb-4">
 <button
 onClick={() => setIsFullPageOpen(true)}
 className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-secondary text-foreground hover:bg-accent transition-all duration-200 border border-border"
 title="Open in Focus Mode"
 >
 <Maximize2 className="w-5 h-5" />
 <span>Focus Mode</span>
 </button>
 </div>
 )}

 <div className="flex flex-col lg:flex-row gap-8 items-start">
 <div className="flex-1 w-full">
 {s3Url ? (
 <PdfViewer
 url={s3Url}
 pageNum={pageNum}
 onPageChange={setPageNum}
 onDoubleClick={() => setIsFullPageOpen(true)}
 noteId={note?.id}
 versionId={currentVersion?.id}
 onCanvasReady={handleCanvasReady}
 enableShortcuts={!isFullPageOpen}
 />
 ) : (
 <div className="p-8 border text-center text-red-500">
 Could not load PDF version.
 </div>
 )}
 </div>

 {currentVersion && (
 <div className="shrink-0 w-full lg:w-[350px]">
 <InteractionsPanel
 versionId={currentVersion.id}
 pageNumber={pageNum}
 getPageImage={getPageImage}
 />
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Full Page Viewer */}
 {s3Url && (
 <FullPageNoteViewer
 url={s3Url}
 initialPage={pageNum}
 isOpen={isFullPageOpen}
 onClose={(page?: number) => {
 setIsFullPageOpen(false);
 if (page) setPageNum(page);
 }}
 noteTitle={note?.title ||""}
 versionId={note?.currentVersionId ||""}
 />
 )}
 </>
 );
}
