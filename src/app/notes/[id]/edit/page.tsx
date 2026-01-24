"use client";

import { use, useState } from "react";
import { api } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import DeleteNoteButton from "@/components/DeleteNoteButton";

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [note] = api.notes.getById.useSuspenseQuery({ id });
    const [currentUser] = api.auth.getMe.useSuspenseQuery();
    const updateNote = api.notes.update.useMutation();
    const getUploadUrl = api.notes.getUploadUrl.useMutation();
    const addVersion = api.versions.addVersion.useMutation();

    const [title, setTitle] = useState(note?.title || "");
    const [description, setDescription] = useState(note?.description || "");
    const [uploading, setUploading] = useState(false);

    if (!note) return <div>Note not found</div>;


    // Authorization check: Only note owner can edit
    if (!currentUser || currentUser.id !== note.authorId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Unauthorized</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        You don&apos;t have permission to edit this note. Only the note owner can make changes.
                    </p>
                    <button
                        onClick={() => router.push(`/notes/${id}`)}
                        className="px-6 py-3 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                    >
                        Back to Note
                    </button>
                </div>
            </div>
        );
    }


    const handleUpdateMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateNote.mutateAsync({ id, title, description });
            router.push(`/notes/${id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update note");
        }
    };

    const handleNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // 1. Get Presigned URL
            const { url, s3Key } = await getUploadUrl.mutateAsync({
                filename: file.name,
                contentType: file.type,
            });

            // 2. Upload to S3
            await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            // 3. Add Version
            await addVersion.mutateAsync({
                noteId: id,
                s3Key: s3Key,
            });

            alert("New version uploaded!");
            router.push(`/notes/${id}`);
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Edit Note</h1>

            <section className="mb-12">
                <h2 className="text-xl font-semibold mb-4">Metadata</h2>
                <form onSubmit={handleUpdateMetadata} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 h-32"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={updateNote.isPending}
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {updateNote.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </section>

            <section className="border-t pt-8">
                <h2 className="text-xl font-semibold mb-4">Upload New Version</h2>
                <p className="text-gray-500 mb-4 text-sm">
                    Upload a new PDF to replace the current version. History will be preserved.
                </p>
                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center">
                    {uploading ? (
                        <div className="text-blue-500">Uploading...</div>
                    ) : (
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleNewVersion}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    )}
                </div>
            </section>

            <DeleteNoteButton noteId={id} />
        </div>
    );
}
