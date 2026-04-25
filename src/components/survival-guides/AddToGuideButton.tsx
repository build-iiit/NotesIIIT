"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddToGuideButton({ noteId, courseId }: { noteId: string, courseId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch guides only when the modal opens to avoid unnecessary requests.
  // We filter guides by the course of this note, because survival guides are course-specific.
  const { data: guides, isLoading } = api.survivalGuide.getByCourse.useQuery(
      { courseId },
      { enabled: isOpen && !!courseId }
  );

  const { data: user } = api.auth.getMe.useQuery();
  const utils = api.useUtils();

  const addMutation = api.survivalGuide.addNote.useMutation({
    onSuccess: () => {
      toast.success("Added to survival guide");
      setIsOpen(false);
      utils.survivalGuide.getByCourse.invalidate({ courseId });
    },
    onError: (err: any) => {
        toast.error(`Failed to add: ${err.message}`);
    }
  });

  // Only the author of a guide can add notes to it.
  const myGuides = guides?.filter(g => g.authorId === user?.id) || [];

  if (!courseId) return null; // If note has no course, it can't be added to a course guide.

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Add to Guide
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Survival Guide</DialogTitle>
          <DialogDescription>
            Select one of your survival guides for this course to bundle this note.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myGuides.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
                <p>You haven&apos;t created any survival guides for this course.</p>
                <p className="mt-2 text-xs">Go to the course page to create one.</p>
            </div>
          ) : (
            <div className="space-y-2">
                {myGuides.map(guide => (
                    <div key={guide.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-sm truncate pr-4">{guide.title}</span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addMutation.mutate({ guideId: guide.id, noteId })}
                            disabled={addMutation.isPending}
                        >
                            Add
                        </Button>
                    </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}