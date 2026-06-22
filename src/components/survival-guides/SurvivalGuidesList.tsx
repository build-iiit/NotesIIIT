"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, BookOpen, ThumbsUp, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function SurvivalGuidesList({ courseId }: { courseId: string }) {
  const { data: guides, isLoading } = api.survivalGuide.getByCourse.useQuery({
    courseId,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const utils = api.useUtils();
  const createMutation = api.survivalGuide.create.useMutation({
    onSuccess: () => {
      toast.success("Survival Guide created!");
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      utils.survivalGuide.getByCourse.invalidate({ courseId });
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const toggleUpvoteMutation = api.survivalGuide.toggleUpvote.useMutation({
      onSuccess: () => {
          utils.survivalGuide.getByCourse.invalidate({ courseId });
      }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Course Survival Guides
        </h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Guide
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Survival Guide</DialogTitle>
              <DialogDescription>
                Bundle important notes, PYQs, and advice for this course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g., How to Ace Midterms"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Wisdom / Advice</label>
                <Input
                  placeholder="e.g., Focus on chapter 3, it always comes up."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate({ courseId, title: newTitle, description: newDescription })}
                disabled={!newTitle.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Guide"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : guides?.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No survival guides exist yet. Be the first senior to leave a legacy!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides?.map((guide) => (
            <div key={guide.id} className="border border-border bg-card rounded-xl p-5 flex flex-col hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg leading-tight line-clamp-2">{guide.title}</h3>
                <div className="bg-muted px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2 border border-border flex items-center gap-1">
                   <FileTextIcon className="h-3 w-3" /> {guide._count.guideNotes}
                </div>
              </div>
              {guide.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow italic">&quot;{guide.description}&quot;</p>
              )}

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{guide.author.name}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toggleUpvoteMutation.mutate({ guideId: guide.id })}
                        className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors"
                    >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{guide._count.upvotes}</span>
                    </button>

                    <Link href={`/guides/${guide.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}