"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { BookOpen, Menu, X, Upload, Trophy, User, LogOut, Home } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
    user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
    onSignOut?: () => void;
}

export function Navbar({ user, onSignOut }: NavbarProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { href: "/", label: "Home", icon: Home },
        { href: "/upload", label: "Upload", icon: Upload, authRequired: true },
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        ...(user ? [{ href: `/users/${user.id}`, label: "Profile", icon: User }] : []),
    ];

    const isActive = (path: string) => {
        if (path === "/") return pathname === path;
        return pathname.startsWith(path);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-3xl bg-gradient-to-r from-white/[0.12] via-white/[0.08] to-white/[0.12] dark:from-black/25 dark:via-black/20 dark:to-black/25 border-b border-white/25 dark:border-white/15 shadow-[0_4px_24px_0_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]">
            {/* Frosted glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <BookOpen className="h-8 w-8 text-orange-500 dark:text-orange-400 transition-transform group-hover:rotate-12 duration-300 drop-shadow-lg" />
                            <div className="absolute inset-0 bg-orange-500/30 blur-xl group-hover:bg-orange-500/50 transition-all duration-300 rounded-full" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow">
                            NotesIIIT
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            if (link.authRequired && !user) return null;
                            const Icon = link.icon;
                            const active = isActive(link.href);

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                    relative px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300
                    flex items-center gap-2 group backdrop-blur-2xl
                    ${active
                                            ? "bg-gradient-to-r from-orange-500/25 to-pink-500/25 text-white dark:text-white border border-white/40 shadow-lg"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:scale-[1.02]"
                                        }
                  `}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}

                                    {/* Active indicator */}
                                    {active && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full shadow-lg" />
                                    )}

                                    {/* Hover effect */}
                                    {!active && (
                                        <span className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right side: Theme Toggle + Auth */}
                    <div className="hidden md:flex items-center gap-3">
                        <ThemeToggle />

                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-2xl bg-gradient-to-r from-orange-500/12 to-pink-500/12 border border-white/30 shadow-inner">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {user.name?.split(" ")[0]}
                                    </span>
                                </div>

                                {onSignOut && (
                                    <button
                                        onClick={onSignOut}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 backdrop-blur-sm bg-white/20 dark:bg-white/10 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all duration-200 border border-white/30 hover:border-red-300/50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden lg:inline">Sign Out</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-6 py-2 rounded-full font-semibold text-sm backdrop-blur-2xl bg-gradient-to-r from-orange-500/80 to-pink-500/80 text-white hover:from-orange-600/90 hover:to-pink-600/90 transition-all duration-300 shadow-[0_4px_16px_0_rgba(251,113,133,0.3)] hover:shadow-[0_6px_24px_0_rgba(251,113,133,0.4)] border border-white/40 hover:scale-[1.05]"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-colors border border-white/20"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                        ) : (
                            <Menu className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/20 dark:border-white/10 animate-in slide-in-from-top duration-200">
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => {
                                if (link.authRequired && !user) return null;
                                const Icon = link.icon;
                                const active = isActive(link.href);

                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 backdrop-blur-sm
                      ${active
                                                ? "bg-gradient-to-r from-orange-500/30 to-pink-500/30 text-white dark:text-white border border-white/30"
                                                : "text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 border border-transparent"
                                            }
                    `}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                    </Link>
                                );
                            })}

                            <div className="border-t border-white/20 dark:border-white/10 my-2" />

                            {/* Mobile Theme Toggle */}
                            <div className="px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-white/10 dark:bg-white/5 rounded-lg border border-white/20">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Theme</span>
                                <ThemeToggle />
                            </div>

                            {/* Mobile Auth Section */}
                            {user ? (
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 backdrop-blur-sm bg-white/10 dark:bg-white/5 rounded-lg p-2 border border-white/20">
                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                                        Signed in as {user.name}
                                    </div>
                                    {onSignOut && (
                                        <button
                                            onClick={() => {
                                                onSignOut();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 backdrop-blur-sm bg-red-100/50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 border border-red-300/50 dark:border-red-800/50"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="mx-4 px-6 py-3 rounded-lg font-semibold text-sm text-center backdrop-blur-md bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 transition-all duration-200 shadow-lg border border-white/30"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
