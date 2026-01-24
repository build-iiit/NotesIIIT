"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { BookOpen, Menu, X, Upload, Trophy, User, LogOut, Home, Shield } from "lucide-react";
import { useState } from "react";

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
        { href: "/upload", label: "Upload", icon: Upload, authRequired: true },
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        ...(user ? [{ href: `/users/${user.id}`, label: "Profile", icon: User }] : []),
        ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield, adminOnly: true }] : []),
    ];

    const isActive = (path: string) => {
        if (path === "/") return pathname === path;
        return pathname.startsWith(path);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-gray-200/20 dark:border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-500 transition-transform group-hover:rotate-12 duration-300" />
                            <div className="absolute inset-0 bg-blue-600/20 blur-xl group-hover:bg-blue-600/40 transition-all duration-300 rounded-full" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
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
                    relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                    flex items-center gap-2 group
                    ${active
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                        }
                  `}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}

                                    {/* Active indicator */}
                                    {active && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
                                    )}

                                    {/* Hover effect */}
                                    <span className="absolute inset-0 bg-blue-600/5 dark:bg-blue-400/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right side: Theme Toggle + Auth */}
                    <div className="hidden md:flex items-center gap-3">
                        <ThemeToggle />

                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/30">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {user.name?.split(" ")[0]}
                                    </span>
                                </div>

                                {onSignOut && (
                                    <button
                                        onClick={onSignOut}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden lg:inline">Sign Out</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="px-6 py-2 rounded-full font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        ) : (
                            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200/20 dark:border-zinc-800/50 animate-in slide-in-from-top duration-200">
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
                      flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
                      ${active
                                                ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                            }
                    `}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {link.label}
                                    </Link>
                                );
                            })}

                            <div className="border-t border-gray-200/20 dark:border-zinc-800/50 my-2" />

                            {/* Mobile Theme Toggle */}
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                                <ThemeToggle />
                            </div>

                            {/* Mobile Auth Section */}
                            {user ? (
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        Signed in as {user.name}
                                    </div>
                                    {onSignOut && (
                                        <button
                                            onClick={() => {
                                                onSignOut();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all duration-200 border border-red-200 dark:border-red-900/30"
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
                                    className="mx-4 px-6 py-3 rounded-lg font-semibold text-sm text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
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
