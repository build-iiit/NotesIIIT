"use client";

import { api } from "@/app/_trpc/client";
import { RequestCard } from "@/components/requests/RequestCard";
import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Search, Sparkles, Filter, Loader2, ArrowUpRight } from "lucide-react";

export default function RequestsPage() {
    const [filter, setFilter] = useState<"new" | "top">("new");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const { ref, inView } = useInView();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetchingNextPage
    } = api.requests.getAll.useInfiniteQuery(
        { limit: 12, sort: filter, search: debouncedSearch || undefined },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const requests = data?.pages.flatMap(page => page.requests) ?? [];

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black selection:bg-orange-500/30">
            {/* Fixed Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px]" />
            </div>

            {/* Hero Section */}
            <div className="relative pt-32 pb-12 overflow-hidden z-10">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Community Board</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        Ask. Share. <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                            Grow Together.
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Need specific notes? Have resources to share? Connect with your peers and help build the ultimate knowledge base.
                    </p>

                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <CreateRequestDialog />
                    </div>
                </div>
            </div>

            {/* Sticky Toolkit */}
            <div className="sticky top-20 z-40 px-4 mb-12">
                <div className="max-w-4xl mx-auto rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2 flex flex-col md:flex-row gap-2">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search for requests, topics, or subjects..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-transparent border border-transparent focus:bg-white dark:focus:bg-black focus:border-orange-500/20 outline-none transition-all placeholder:text-gray-400 dark:text-white"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex bg-gray-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter("new")}
                            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${filter === "new"
                                ? "bg-white dark:bg-black text-gray-900 dark:text-white shadow-lg shadow-black/5"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            Newest
                        </button>
                        <button
                            onClick={() => setFilter("top")}
                            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${filter === "top"
                                ? "bg-white dark:bg-black text-gray-900 dark:text-white shadow-lg shadow-black/5"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            Top Voted
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
                {isLoading && requests.length === 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="aspect-[4/5] rounded-3xl bg-white/50 dark:bg-zinc-900/50 border border-white/50 dark:border-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : requests.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {requests.map((request, i) => (
                            <div key={request.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${i * 50}ms` }}>
                                <RequestCard request={request} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 rounded-3xl bg-white/30 dark:bg-white/5 border border-white/50 dark:border-white/5 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Filter className="w-10 h-10 text-orange-500/50" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No requests found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                            We couldn't find any requests searching for "{search}".
                        </p>
                        <button
                            onClick={() => setSearch("")}
                            className="px-6 py-2 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-sm font-semibold hover:border-orange-500 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Loader */}
                {isFetchingNextPage && (
                    <div className="py-12 flex justify-center">
                        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-white/20 dark:border-white/10 flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            <span className="text-sm font-medium">Loading more requests...</span>
                        </div>
                    </div>
                )}

                <div ref={ref} className="h-4" />
            </div>
        </div>
    );
}
