"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, KeyboardEvent } from "react";
import { api } from "@/app/_trpc/client";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const createRequestSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    // tags is handled separately in state, but validated on submit
});

export function CreateRequestDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const router = api.useUtils();

    const form = useForm<z.infer<typeof createRequestSchema>>({
        resolver: zodResolver(createRequestSchema),
    });

    const createMutation = api.requests.create.useMutation({
        onSuccess: () => {
            setIsOpen(false);
            form.reset();
            setTags([]);
            router.requests.getAll.invalidate();
        },
    });

    const onSubmit = (values: z.infer<typeof createRequestSchema>) => {
        createMutation.mutate({
            title: values.title,
            description: values.description,
            tags: tags,
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const addTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
            setTags([...tags, trimmed]);
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
            >
                <Plus className="w-5 h-5" />
                New Request
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Make a Request</h2>
                            <p className="text-gray-500 dark:text-gray-400">Ask the community for study materials.</p>
                        </div>

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Title</label>
                                <input
                                    {...form.register("title")}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    placeholder="e.g. Linear Algebra Endsem Papers"
                                    autoFocus
                                />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-red-500 font-medium pl-1">{form.formState.errors.title.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Description</label>
                                <textarea
                                    {...form.register("description")}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none min-h-[120px] resize-none transition-all"
                                    placeholder="Describe specifically what you are looking for..."
                                />
                                {form.formState.errors.description && (
                                    <p className="text-sm text-red-500 font-medium pl-1">{form.formState.errors.description.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Tags</label>
                                <div className={cn(
                                    "w-full px-2 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus-within:bg-white dark:focus-within:bg-black focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all flex flex-wrap gap-2 items-center min-h-[50px]",
                                    tags.length >= 5 && "opacity-80 cursor-not-allowed"
                                )}>
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-sm font-medium animate-in zoom-in-50 duration-200">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-500/30 rounded-full transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={addTag}
                                        disabled={tags.length >= 5}
                                        className="flex-1 bg-transparent border-none outline-none min-w-[120px] px-2 py-1 text-sm"
                                        placeholder={tags.length === 0 ? "Type tag and press Enter..." : tags.length >= 5 ? "Max tags reached" : "Add another..."}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 pl-1">{tags.length}/5 tags • Press Enter to add</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none mt-2"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Post Request <Plus className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
