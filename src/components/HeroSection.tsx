import Link from "next/link";
import { ArrowRight, FileText, Share2, Users } from "lucide-react";

export function HeroSection() {
    return (
        <div className="flex flex-col items-start justify-center min-h-[80vh] px-4 max-w-4xl">
            <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-tight">
                    Your central hub <br /> for study notes.
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                    A minimal, distraction-free platform for IIIT students to organize, share, and collaborate on lecture materials.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Get Started <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/leaderboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium border border-border bg-background hover:bg-secondary transition-colors"
                    >
                        View Leaderboard
                    </Link>
                </div>
            </div>

            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full border-t border-border pt-10">
                <div className="space-y-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary text-foreground">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Organize everything</h3>
                    <p className="text-muted-foreground text-sm">Keep all your lecture notes, PDFs, and summaries neatly structured in folders.</p>
                </div>
                <div className="space-y-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary text-foreground">
                        <Share2 className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Share effortlessly</h3>
                    <p className="text-muted-foreground text-sm">Make your notes public or share them specifically with study groups.</p>
                </div>
                <div className="space-y-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary text-foreground">
                        <Users className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Collaborate</h3>
                    <p className="text-muted-foreground text-sm">Learn together. Annotate, discuss, and build the best study resources.</p>
                </div>
            </div>
        </div>
    );
}
