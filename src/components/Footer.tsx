import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
    return (
        <footer className="w-full border-t border-border/40 bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 py-6 mt-20">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0 px-4 mx-auto max-w-7xl">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        Built by{" "}
                        <a
                            href="https://github.com/Entropy-rgb/iiitNotes"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium underline underline-offset-4"
                        >
                            iiitNotes Team
                        </a>
                        . The source code is available on{" "}
                        <a
                            href="https://github.com/Entropy-rgb/iiitNotes"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium underline underline-offset-4"
                        >
                            GitHub
                        </a>
                        .
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/transparency"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Transparency
                    </Link>
                    <Link
                        href="https://github.com/Entropy-rgb/iiitNotes"
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Github className="h-5 w-5" />
                        <span className="sr-only">GitHub</span>
                    </Link>
                </div>
            </div>
        </footer>
    );
}
