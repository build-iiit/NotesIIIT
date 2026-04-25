"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, FolderKanban, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
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

export default function ProjectsPage() {
  const { data: session, status } = api.auth.getMe.useQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const utils = api.useUtils();
  const { data: projects, isLoading } = api.researchProject.getAll.useQuery(undefined, {
      enabled: !!session?.id
  });

  const createMutation = api.researchProject.create.useMutation({
    onSuccess: () => {
      toast.success("Research Project created successfully!");
      setIsCreateModalOpen(false);
      setNewProjectTitle("");
      setNewProjectDescription("");
      utils.researchProject.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    createMutation.mutate({
      title: newProjectTitle,
      description: newProjectDescription,
    });
  };

  const filteredProjects = projects?.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "pending") {
      return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  if (!session) {
      return (
        <div className="container mx-auto p-6 max-w-6xl text-center py-24">
            <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h1 className="text-2xl font-bold mb-4">Research Workspaces</h1>
            <p className="text-muted-foreground mb-8">Sign in to create and manage your research workspaces.</p>
            <Link href="/login">
                <Button>Sign In to Continue</Button>
            </Link>
        </div>
      );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderKanban className="h-8 w-8 text-primary" />
            Research Workspaces
          </h1>
          <p className="text-muted-foreground mt-1">
            Create projects, add documents, and synthesize knowledge across multiple papers.
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Research Project</DialogTitle>
              <DialogDescription>
                Start a new workspace to organize your related academic papers.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  placeholder="e.g., NLP Scaling Laws Analysis"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  placeholder="e.g., A review of parameters vs performance..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProjects?.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search query."
              : "Create your first research project to start synthesizing knowledge across documents."}
          </p>
          {!searchQuery && (
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="border border-border bg-card text-card-foreground rounded-xl p-6 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {project.title}
                  </h3>
                  <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2">
                    {project._count.projectNotes} Docs
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                    {project.description}
                  </p>
                )}
                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <span>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}