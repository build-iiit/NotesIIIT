"use client";

import { api } from "@/app/_trpc/client";
import { RequestCard } from "@/components/requests/RequestCard";
import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Search, Sparkles, Filter, Loader2 } from "lucide-react";

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
        <div className="min-h-screen bg-white dark:bg-black selection:bg-orange-500/30">
            {/* Hero Section */}
            <div className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-orange-500 opacity-20 blur-[100px]"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium mb-6 border border-orange-200 dark:border-orange-500/20">
                        <Sparkles className="w-4 h-4" />
                        <span>Community Request Board</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6">
                        Find What You Need, <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                            Help Others Succeed.
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        Request notes, papers, or study materials from the community.
                        Earn reputation by fulfilling requests and helping your peers.
                    </p>

                    <div className="flex justify-center">
                        <CreateRequestDialog />
                    </div>
                </div>
            </div>

            {/* Sticky Toolbar */}
            <div className="sticky top-16 z-40 border-y border-gray-100 dark:border-zinc-900 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search requests..."
                            className="w-full pl-9 pr-4 py-2 rounded-full bg-gray-100 dark:bg-zinc-900 border-none outline-none focus:ring-2 focus:ring-orange-500/50 text-sm transition-all"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                        <button
                            onClick={() => setFilter("new")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === "new" ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Newest
                        </button>
                        <button
                            onClick={() => setFilter("top")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === "top" ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Top Voted
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Content */}
                {isLoading && requests.length === 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-zinc-900 animate-pulse border border-gray-200 dark:border-zinc-800" />
                        ))}
                    </div>
                ) : requests.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {requests.map(request => (
                            <RequestCard key={request.id} request={request} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No requests found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            We couldn't find any requests matching your search. Try adjusting your filters or create a new one!
                        </p>
                    </div>
                )}

                {/* Loader */}
                {isFetchingNextPage && (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                )}

                <div ref={ref} className="h-4" />
            </div>
        </div>
    );
}
