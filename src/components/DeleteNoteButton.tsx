"use client";

import dynamic from 'next/dynamic';

// Force client-only rendering - no SSR
const ClientOnlyDeleteButton = dynamic(
    () => Promise.resolve(({ noteId }: { noteId: string }) => {
        console.log("=== CLIENT-ONLY DELETE BUTTON RENDERED ===", noteId);

        return (
            <section className="border-t pt-8 bg-yellow-100 p-4">
                <h2 className="text-2xl font-bold text-red-600">DANGER ZONE (Client Only)</h2>
                <p className="my-4">Note ID: {noteId}</p>

                <button
                    onClick={() => {
                        alert(`Delete button clicked for note: ${noteId}`);
                        console.log("Button click handler executed!");
                    }}
                    className="bg-red-600 text-white px-6 py-3 rounded text-lg font-bold hover:bg-red-700"
                >
                    DELETE NOTE (CLIENT-ONLY TEST)
                </button>
            </section>
        );
    }),
    { ssr: false, loading: () => <div className="p-4 bg-gray-100">Loading delete button...</div> }
);

export default function DeleteNoteButton({ noteId }: { noteId: string }) {
    return <ClientOnlyDeleteButton noteId={noteId} />;
}
