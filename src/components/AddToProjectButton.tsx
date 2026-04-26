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

export function AddToProjectButton({ noteId }: { noteId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: projects, isLoading } = api.researchProject.getAll.useQuery(undefined, {
      enabled: isOpen
  });

  const utils = api.useUtils();

  const addMutation = api.researchProject.addNote.useMutation({
    onSuccess: () => {
      toast.success("Document added to workspace");
      setIsOpen(false);
      utils.researchProject.getAll.invalidate();
    },
    onError: (err: any) => {
        toast.error(`Failed to add: ${err.message}`);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Add to Workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Research Workspace</DialogTitle>
          <DialogDescription>
            Select a project to add this document to for cross-document synthesis.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
                You don&apos;t have any research projects yet. Create one from the Workspaces tab.
            </p>
          ) : (
            <div className="space-y-2">
                {projects.map((project) => (
                    <div key={project.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-sm truncate pr-4">{project.title}</span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addMutation.mutate({ projectId: project.id, noteId })}
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