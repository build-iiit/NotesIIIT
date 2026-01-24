import Link from "next/link";
import { FileText, Eye, ThumbsUp, Calendar } from "lucide-react";

export interface Note {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    viewCount: number;
    voteScore: number;
    author: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

interface UserNotesGridProps {
    notes: Note[];
    userName?: string;
}

export function UserNotesGrid({ notes, userName }: UserNotesGridProps) {
    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No notes yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    {userName ? `${userName} hasn't shared any notes yet.` : "This user hasn't shared any notes yet."}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
                <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="group block"
                >
                    <div className="h-full rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        {/* Header with gradient */}
                        <div className="h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300" />

                            {/* PDF icon overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileText className="h-16 w-16 text-white/40 group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            {/* Stats overlay */}
                            <div className="absolute bottom-3 right-3 flex gap-2">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/30">
                                    <Eye className="h-3 w-3 text-white" />
                                    <span className="text-xs font-medium text-white">{note.viewCount}</span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/30">
                                    <ThumbsUp className="h-3 w-3 text-white" />
                                    <span className="text-xs font-medium text-white">{note.voteScore}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {note.title}
                            </h3>

                            {note.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                    {note.description}
                                </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(note.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}</span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
