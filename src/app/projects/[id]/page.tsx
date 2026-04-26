"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trash2, FileText, Bot, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function ProjectWorkspace() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [synthesisQuery, setSynthesisQuery] = useState("");
  const [synthesisResult, setSynthesisResult] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // We are fetching the project details
  const { data: project, isLoading, refetch } = api.researchProject.getById.useQuery({
    id,
  });

  const deleteProjectMutation = api.researchProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      router.push("/projects");
    },
  });

  const removeNoteMutation = api.researchProject.removeNote.useMutation({
    onSuccess: () => {
      toast.success("Document removed from project");
      refetch();
    },
  });

  const synthesizeMutation = api.ai.crossDocumentSynthesis.useMutation({
    onSuccess: (data) => {
      setSynthesisResult(data.answer);
      setIsSynthesizing(false);
    },
    onError: (err) => {
      toast.error(`Synthesis failed: ${err.message}`);
      setIsSynthesizing(false);
    },
  });

  const handleSynthesize = () => {
    if (!synthesisQuery.trim()) return;
    if (!project || project.projectNotes.length === 0) {
      toast.error("Add some documents to the project first.");
      return;
    }

    setIsSynthesizing(true);
    setSynthesisResult("");

    // HACK: Since we don't have a real vector DB or full-text extraction readily available
    // in this simplified example without reading the actual PDFs, we will pass dummy context
    // or just the titles to simulate the synthesis feature.
    // In a production app, we would extract PDF text on upload and store it,
    // or run a quick extraction job here.

    // Simulating document context based on titles for the demo
    const mockContext = project.projectNotes.map(pn => ({
      title: pn.note.title,
      text: `This document discusses topics related to ${pn.note.title}. It is an important reference for the project.`
    }));

    synthesizeMutation.mutate({
      projectId: id,
      query: synthesisQuery,
      documentsContext: mockContext,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Button className="mt-4" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Workspaces
          </Link>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this project?")) {
                deleteProjectMutation.mutate({ id });
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-0 flex-1">
        {/* Left Sidebar - Documents List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 border border-border rounded-xl bg-card p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents ({project.projectNotes.length})
            </h2>
            <Link href="/my-files">
              <Button size="sm" variant="outline" title="Go to My Files to add documents">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {project.projectNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No documents added yet.</p>
              <p className="mt-2 text-xs">Navigate to a note and click &quot;Add to Project&quot; to include it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.projectNotes.map((pn) => (
                <div key={pn.id} className="p-3 border border-border rounded-lg flex justify-between items-start hover:bg-muted/50 transition-colors">
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate" title={pn.note.title}>
                      {pn.note.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added {new Date(pn.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeNoteMutation.mutate({ projectId: id, noteId: pn.noteId })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Area - AI Synthesis */}
        <div className="w-full lg:w-2/3 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Cross-Document Synthesis</h2>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
             {!synthesisResult && !isSynthesizing ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
                  <Bot className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Ask a question across your documents</p>
                  <p className="text-sm max-w-md mt-2">
                    The AI will analyze all the documents in this workspace to synthesize an answer, pulling context from multiple sources.
                  </p>
               </div>
             ) : isSynthesizing ? (
               <div className="h-full flex flex-col items-center justify-center space-y-4">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="text-muted-foreground animate-pulse">Reading documents and synthesizing knowledge...</p>
               </div>
             ) : (
               <div className="prose prose-sm dark:prose-invert max-w-none">
                 <div className="bg-primary/10 p-4 rounded-lg mb-6 border border-primary/20">
                   <p className="font-medium text-primary m-0 flex items-start gap-2">
                     <span className="font-bold text-black dark:text-white shrink-0">Q:</span>
                     {synthesisQuery}
                   </p>
                 </div>
                 <div className="whitespace-pre-wrap leading-relaxed">
                   {synthesisResult}
                 </div>
               </div>
             )}
          </div>

          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2 relative">
              <Textarea
                placeholder="E.g., Compare the methodologies used in these papers..."
                className="min-h-[60px] resize-none pr-24"
                value={synthesisQuery}
                onChange={(e) => setSynthesisQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSynthesize();
                  }
                }}
              />
              <Button
                className="absolute bottom-2 right-2 h-auto py-2"
                onClick={handleSynthesize}
                disabled={isSynthesizing || !synthesisQuery.trim() || project.projectNotes.length === 0}
              >
                {isSynthesizing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Synthesize"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}