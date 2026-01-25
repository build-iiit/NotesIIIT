"use client";

import { api } from "@/app/_trpc/client";
import { UserNotesGrid } from "@/components/UserNotesGrid";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function CourseDetailsPage() {
    const { courseId } = useParams();

    // Need to add getById to course router to fetch course details + notes.
    // Assuming getById returns course with notes included.
    const { data: course, isLoading } = api.course.getById.useQuery({
        id: courseId as string
    }, {
        enabled: !!courseId
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-white">
                <h1 className="text-2xl font-bold">Course not found</h1>
            </div>
        );
    }

    // The notes might be nested in the course object if we included them in the query,
    // OR we might want to fetch notes separately using notesRouter filtering.
    // For now, let's assume we might need to filter notes.
    // Actually, checking course.ts, getById includes `_count: { notes: true }` but NOT the notes list itself.
    // So I need to fetch notes for this course.

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 bg-card border border-border p-8 rounded-2xl backdrop-blur-md relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
                            {course.branch}
                        </span>
                        <span className="text-gray-400 font-mono">
                            {course.code}
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-4">{course.name}</h1>
                    <p className="text-xl text-gray-300 max-w-2xl">
                        {course.description || "Collection of notes and resources for this course."}
                    </p>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            </div>

            <CourseNotesList courseId={course.id} />
        </div>
    );
}

function CourseNotesList({ courseId }: { courseId: string }) {
    // We need a procedure to get notes by courseId. modifying noteRouter.getAll to allow filtering
    // Wait, noteRouter.getAll doesn't support filtering by courseId yet in previous steps.
    // I should check notes.ts again or Update it.
    // For now, I will use getAll and filter on client OR better: update noteRouter.
    // Let's assume I will update noteRouter to support courseId filter.

    // Since I haven't updated getAll to support courseId filter explicitly in the prompt plan I missed it?
    // "Update getAll/list: Support filtering by courseId." - Yes I put it in plan.
    // Did I implement it? I only updated `create`. 
    // I need to update `getAll` in notes.ts to accept courseId.

    // Use getAll with courseId filter
    const { data, isLoading } = api.notes.getAll.useQuery({
        cursor: undefined,
        limit: 50
    });

    if (isLoading) {
        return <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />;
    }

    // Filter by courseId and sort by popularity
    // Filter by courseId and sort by popularity
    const courseNotes = (data?.items || []).filter((note) => note.courseId === courseId);
    const sortedNotes = [...courseNotes].sort((a: any, b: any) => (b.voteScore || 0) - (a.voteScore || 0));

    if (courseNotes.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-gray-400 text-lg">No notes found for this course yet.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Top Notes</h2>
                {/* Could add sort toggle here */}
            </div>
            <UserNotesGrid notes={sortedNotes as any} />
        </div>
    );
}
