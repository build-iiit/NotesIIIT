"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import {
    BookOpen, Menu, X, Upload, Trophy,
    User, LogOut, Home, Shield, Search,
    Bookmark, Folder, Users
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface NavbarProps {
    user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string;
    } | null;
    onSignOut?: () => void;
}

export function Navbar({ user, onSignOut }: NavbarProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { href: "/", label: "Home", icon: Home },
        { href: "/search", label: "Search", icon: Search },
        { href: "/courses", label: "Courses", icon: BookOpen },
        { href: "/upload", label: "Upload", icon: Upload, authRequired: true },
        { href: "/my-files", label: "My Files", icon: Folder, authRequired: true },
        { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, authRequired: true },
        { href: "/social", label: "Social", icon: Users },
        ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield, adminOnly: true }] : []),
    ];

    const isActive = (path: string) => {
        if (path === "/") return pathname === path;
        return pathname.startsWith(path);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        <div className="relative">
                            <BookOpen className="h-8 w-8 text-orange-500 transition-transform group-hover:rotate-12 duration-300" />
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl group-hover:bg-orange-500/40 transition-all duration-300 rounded-full" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow hidden sm:block">
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
                                            ? "text-orange-600 dark:text-orange-400 font-bold bg-white/40 dark:bg-white/10"
                                            : "text-gray-900 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-white/30 dark:hover:bg-white/5"
                                        }
                  `}
                                >
                                    <Icon className={`h-4 w-4 ${active ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-400 group-hover:text-orange-600"}`} />
                                    {link.label}

                                    {/* Active indicator */}
                                    {active && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right side: Auth & Theme */}
                    <div className="hidden md:flex items-center gap-3">
                        <ThemeToggle />
                        {user ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/users/${user.id}`}
                                    className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-white/30 hover:ring-orange-400/50 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                                    aria-label="View Profile"
                                >
                                    <Image
                                        src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                        alt={user.name || "Profile"}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                                </Link>

                                {onSignOut && (
                                    <button
                                        onClick={onSignOut}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 backdrop-blur-3xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-500 shadow-sm border border-black/5 dark:border-white/25 hover:border-orange-300/50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden lg:inline">Sign Out</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-6 py-2 rounded-full font-semibold text-sm text-gray-900 dark:text-gray-200 backdrop-blur-3xl bg-white/40 dark:bg-white/10 border border-black/5 dark:border-white/25 hover:bg-orange-500 hover:text-white dark:hover:bg-white/20 transition-all duration-500 hover:border-orange-500"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 border border-white/25 ml-auto"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                                                ? "bg-gradient-to-r from-orange-500/30 to-pink-500/30 text-white border border-white/30"
                                                : "text-gray-800 dark:text-gray-200 hover:bg-white/20 border border-transparent"
                                            }
                    `}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                    </Link>
                                );
                            })}

                            <div className="border-t border-white/20 dark:border-white/10 my-2" />

                            <div className="px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-white/10 dark:bg-white/5 rounded-lg border border-white/20">
                                <span className="text-sm font-medium">Theme</span>
                                <ThemeToggle />
                            </div>

                            {user ? (
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm backdrop-blur-sm bg-white/10 dark:bg-white/5 rounded-lg p-2 border border-white/20">
                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                                        Signed in as {user.name}
                                    </div>
                                    {onSignOut && (
                                        <button
                                            onClick={() => {
                                                onSignOut();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 border border-white/25"
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
                                    className="mx-4 px-6 py-3 rounded-lg font-semibold text-sm text-center backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 border border-white/25"
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