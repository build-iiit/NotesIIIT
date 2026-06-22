import Link from"next/link";

export function HeroSection() {
 return (
 <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
 <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-primary">
 Share Notes. <br /> Ace Exams.
 </h1>
 <p className="text-xl text-muted-foreground max-w-2xl mb-10">
 The ultimate platform for IIIT students to share lecture notes,
 collaborate on study materials, and help each other succeed.
 </p>
 <div className="flex gap-4">
 <Link
 href="/login"
 className="px-8 py-3 rounded-lg font-semibold text-lg text-primary-foreground bg-primary hover:opacity-90 transition-all duration-200 active:scale-95"
 >
 Get Started
 </Link>
 <Link
 href="/search"
 className="px-8 py-3 rounded-lg font-semibold text-lg text-foreground bg-secondary hover:bg-accent transition-all duration-200 border border-border active:scale-95"
 >
 Browse Notes
 </Link>
 </div>
 </div>
 );
}
