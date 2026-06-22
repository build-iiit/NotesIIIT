"use client";

import { api } from"@/app/_trpc/client";
import { useRouter } from"next/navigation";
import { Trash2 } from"lucide-react";
import { useState } from"react";

export default function DeleteNoteButton({ noteId }: { noteId: string }) {
 const router = useRouter();
 const deleteNote = api.notes.delete.useMutation();
 const [isDeleting, setIsDeleting] = useState(false);

 const handleDelete = async () => {
 // Confirmation dialog
 const confirmed = window.confirm(
"Are you sure you want to delete this note? This action cannot be undone."
 );

 if (!confirmed) return;

 try {
 setIsDeleting(true);
 await deleteNote.mutateAsync({ id: noteId });

 // Redirect to home page after successful deletion
 router.push("/");
 router.refresh();
 } catch (error) {
 console.error("Failed to delete note:", error);
 alert("Failed to delete note. Please try again.");
 setIsDeleting(false);
 }
 };

 return (
 <section className="border-t border-destructive/20 pt-8 mt-8">
 <div className="bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-destructive/15 rounded-xl">
 <Trash2 className="h-6 w-6 text-destructive" />
 </div>

 <div className="flex-1">
 <h2 className="text-xl font-bold text-destructive mb-2">
 Danger Zone
 </h2>
 <p className="text-sm text-muted-foreground mb-4">
 Once you delete this note, there is no going back. All versions and associated data will be permanently removed.
 </p>

 <button
 onClick={handleDelete}
 disabled={isDeleting}
 className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Trash2 className="h-4 w-4" />
 {isDeleting ?"Deleting..." :"Delete Note Permanently"}
 </button>
 </div>
 </div>
 </div>
 </section>
 );
}
