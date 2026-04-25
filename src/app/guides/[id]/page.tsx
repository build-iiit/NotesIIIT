"use client";

import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Trash2, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { use } from "react";

export default function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: guide, isLoading } = api.survivalGuide.getById.useQuery({ id });
  const { data: user } = api.auth.getMe.useQuery();

  const deleteMutation = api.survivalGuide.delete.useMutation({
    onSuccess: () => {
      toast.success("Guide deleted");
      if (guide?.courseId) {
        router.push(`/courses/${guide.courseId}`);
      } else {
        router.push("/courses");
      }
    },
  });

  const removeNoteMutation = api.survivalGuide.removeNote.useMutation({
    onSuccess: () => {
      toast.success("Note removed from guide");
      api.useUtils().survivalGuide.getById.invalidate({ id });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">Guide not found</h1>
        <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const isAuthor = user?.id === guide.authorId;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link href={`/courses/${guide.courseId}`} className="text-sm text-muted-foreground hover:text-primary flex items-center mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Course
      </Link>

      <div className="bg-card border border-border rounded-2xl p-8 mb-8 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-3xl font-extrabold mb-2">{guide.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-4 w-4"/> {guide.author.name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4"/> {guide._count.upvotes} upvotes</span>
                </div>
            </div>
            {isAuthor && (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                        if(confirm("Delete this survival guide?")) {
                            deleteMutation.mutate({ id });
                        }
                    }}
                >
                    <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
            )}
        </div>

        {guide.description && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-primary mb-2">Senior&apos;s Wisdom</h3>
                <p className="text-muted-foreground whitespace-pre-wrap italic">
                    &quot;{guide.description}&quot;
                </p>
            </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Bundled Materials</h2>
          {/* We could add an "Add note" button here if isAuthor,
              but typically they will browse notes and add them from the note page. */}
      </div>

      {guide.guideNotes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
              <p className="text-muted-foreground">No notes have been added to this guide yet.</p>
              {isAuthor && <p className="text-sm mt-2">Go to a note and click &quot;Add to Guide&quot; to include it.</p>}
          </div>
      ) : (
          <div className="space-y-4">
              {guide.guideNotes.map(gn => (
                  <div key={gn.id} className="bg-card border border-border rounded-xl p-5 flex justify-between items-center hover:border-primary/50 transition-colors">
                      <div>
                          <Link href={`/notes/${gn.note.id}`} className="font-semibold text-lg hover:text-primary transition-colors block mb-1">
                              {gn.note.title}
                          </Link>
                          <div className="text-xs text-muted-foreground flex gap-3">
                              <span>{gn.note.noteType}</span>
                              <span>By {gn.note.author.name}</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Link href={`/notes/${gn.note.id}`}>
                              <Button variant="secondary" size="sm">View Note</Button>
                          </Link>
                          {isAuthor && (
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => removeNoteMutation.mutate({ guideId: id, noteId: gn.note.id })}
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}