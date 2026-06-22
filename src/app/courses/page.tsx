"use client";

import { api } from"@/app/_trpc/client";
import { BookOpen, Folder, Search } from"lucide-react";
import Link from"next/link";
import { useState } from"react";

export default function CoursesPage() {
 const { data: courses, isLoading } = api.course.getAll.useQuery();
 const [search, setSearch] = useState("");

 const filteredCourses = courses?.filter((course) =>
 course.name.toLowerCase().includes(search.toLowerCase()) ||
 course.code.toLowerCase().includes(search.toLowerCase())
 );

 // Group courses by branch
 const groupedCourses = filteredCourses?.reduce((acc, course) => {
 const branch = course.branch ||"Other";
 if (!acc[branch]) acc[branch] = [];
 acc[branch].push(course);
 return acc;
 }, {} as Record<string, typeof courses>);

 if (isLoading) {
 return (
 <div className="container mx-auto px-4 py-8 pt-24">
 <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse mb-3" />
 <div className="h-5 w-64 bg-white/10 rounded-lg animate-pulse mb-8" />
 <div className="h-8 w-36 bg-white/10 rounded-lg animate-pulse mb-6" />
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white/[0.08] dark:bg-white/[0.03] border border-white/10 rounded-xl p-6 h-52 flex flex-col gap-3">
 <div className="flex justify-between items-center">
 <div className="h-10 w-10 bg-white/10 rounded-lg animate-pulse" />
 <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
 </div>
 <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse mt-2" />
 <div className="space-y-2 mt-1">
 <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
 <div className="h-3 w-5/6 bg-white/10 rounded animate-pulse" />
 </div>
 </div>
 ))}
 </div> </div>
 );
 }

 return (
 <div className="container mx-auto px-4 py-8 pt-24"> <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Courses</h1>
 <p className="text-gray-600 dark:text-gray-400 mb-8">Browse notes by branch and course.</p>

 {/* Search Bar */}
 <div className="relative max-w-xl mb-10">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search courses by name or code..."
 className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
 />
 </div>

 {groupedCourses && Object.entries(groupedCourses).map(([branch, branchCourses]) => (
 <div key={branch} className="mb-10">
 <div className="flex items-center gap-3 mb-4">
 <Folder className="h-6 w-6 text-primary" />
 <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{branch}</h2>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
 {branchCourses?.map((course) => (
 <Link href={`/courses/${course.id}`} key={course.id} className="group">
 <div className="bg-white/40 dark:bg-zinc-900/60 border border-white/30 dark:border-white/10 rounded-xl p-6 hover:shadow-[0_8px_30px_var(--glow-color)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"> <div className="flex items-start justify-between mb-4">
 <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors">
 <BookOpen className="h-6 w-6 text-primary" />
 </div>
 <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/40 px-2 py-1 rounded">
 {course.code}
 </span>
 </div>

 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
 {course.name}
 </h3>

 <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-grow">
 {course.description ||"No description available."}
 </p>

 <div className="flex items-center text-sm text-gray-500 mt-auto pt-4 border-t border-black/5 dark:border-white/5">
 {/* TODO: Add note count when available in course object if needed */}
 <span className="text-primary group-hover:underline">View Notes &rarr;</span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 ))}
 </div>
 );
}
