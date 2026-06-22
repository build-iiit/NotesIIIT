"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { ThemeToggle } from"./theme-toggle";
import {
 BookOpen, Menu, X, Upload, Trophy,
 User, LogOut, Home, Shield, Search,
 Bookmark, Folder, Users, Hand, PenSquare
} from"lucide-react";
import { useState } from"react";
import { ProfileImage } from"./ProfileImage";
import { NotificationBell } from"./NotificationBell";


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
 { href:"/", label:"Home", icon: Home },
 { href:"/markdown/new", label:"Note", icon: PenSquare, authRequired: true },
 { href:"/upload", label:"Upload", icon: Upload, authRequired: true },
 { href:"/my-files", label:"Folders", icon: Folder, authRequired: true },
 { href:"/requests", label:"Requests", icon: Hand },
 { href:"/social", label:"Social", icon: Users, authRequired: true },
 ...(user?.role ==="ADMIN" ? [{ href:"/admin", label:"Admin", icon: Shield, adminOnly: true }] : []),
 { href:"/search", label:"Search", icon: Search },
 ];

 const isActive = (path: string) => {
 if (!pathname) return false;
 if (path ==="/") return pathname === path;
 return pathname.startsWith(path);
 };

 return (
 <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-zinc-200 dark:border-zinc-800">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-16 gap-4">
 {/* Logo */}
 <Link href="/" className="flex items-center gap-2 group shrink-0">
 <div className="relative">
 <BookOpen className="h-8 w-8 transition-transform group-hover:rotate-12 duration-300 text-primary" />
 </div>
 <span className="text-xl font-bold bg-clip-text text-transparent drop-shadow hidden sm:block bg-gradient-to-r from-[var(--brand-from)] via-[var(--brand-via)] to-[var(--brand-to)]">
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
 flex items-center gap-2 group
 ${active
 ?"text-primary dark:text-primary font-bold bg-zinc-100 dark:bg-zinc-900"
 :"text-gray-900 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
 }
 `}
 >
 <Icon className={`h-4 w-4 ${active ?"text-primary dark:text-primary" :"text-gray-700 dark:text-gray-400 group-hover:text-primary"}`} />
 {link.label}

 {/* Active indicator */}
 {active && (
 <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-full" />
 )}
 </Link>
 );
 })}
 </div>

 {/* Right side: Auth & Theme */}
 <div className="hidden md:flex items-center gap-3">
 {user && (
 <Link
 href="/bookmarks"
 className={`p-2 rounded-full transition-all duration-500 border ${isActive("/bookmarks")
 ?"bg-primary/25 border-primary/45 text-primary"
 :"border-zinc-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-primary hover:border-primary/30"
 }`}
 aria-label="Bookmarks"
 >
 <Bookmark className="h-5 w-5" />
 </Link>
 )}
 <ThemeToggle />
 {user ? (
 <div className="flex items-center gap-3">
 <NotificationBell />
 <Link
 href={`/users/${user.id}`}
 className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-white/30 hover:ring-primary/50 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
 aria-label="View Profile"
 >
 <ProfileImage
 src={user.image}
 alt={user.name ||"Profile"}
 fallback={user.name ||"User"}
 width={36}
 height={36}
 className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/20"
 />
 <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 z-10" />
 </Link>

 {onSignOut && (
 <button
 onClick={onSignOut}
 className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-500 shadow-sm border border-zinc-200 dark:border-zinc-800"
 >
 <LogOut className="h-4 w-4" />
 <span className="hidden lg:inline">Sign Out</span>
 </button>
 )}
 </div>
 ) : (
 <Link
 href="/login"
 className="px-6 py-2 rounded-full font-semibold text-sm text-gray-900 dark:text-gray-205 bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-primary hover:text-primary-foreground transition-all duration-500 hover:border-primary"
 >
 Sign In
 </Link>
 )}
 </div>

 {/* Mobile menu button */}
 <button
 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
 className="md:hidden p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-500 border border-zinc-200 dark:border-zinc-850 ml-auto text-zinc-900 dark:text-zinc-100"
 aria-label="Toggle menu"
 >
 {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
 </button>
 </div>

 {/* Mobile Navigation Menu */}
 {mobileMenuOpen && (
 <div className="md:hidden py-4 border-t border-zinc-200 dark:border-zinc-800 bg-background animate-in slide-in-from-top duration-200">
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
 ?"bg-primary/20 text-primary border border-primary/30"
 :"text-gray-800 dark:text-gray-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
 }
 `}
 >
 <Icon className="h-5 w-5" />
 {link.label}
 </Link>
 );
 })}

 <div className="border-t border-zinc-200 dark:border-zinc-800 my-2" />

 <div className="px-4 py-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
 <span className="text-sm font-medium">Theme</span>
 <ThemeToggle />
 </div>

 {user && (
 <Link
 href="/bookmarks"
 onClick={() => setMobileMenuOpen(false)}
 className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${isActive("/bookmarks")
 ?"bg-primary/20 text-primary border border-primary/30"
 :"text-gray-800 dark:text-gray-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
 }`}
 >
 <Bookmark className="h-5 w-5" />
 Bookmarks
 </Link>
 )}

 {user ? (
 <div className="px-4 py-3 space-y-2">
 <div className="flex items-center gap-2 text-sm bg-zinc-50 dark:bg-zinc-950 rounded-lg p-2 border border-zinc-200 dark:border-zinc-800">
 <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
 Signed in as {user.name}
 </div>

 <Link
 href={`/users/${user.id}`}
 onClick={() => setMobileMenuOpen(false)}
 className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-500 border border-zinc-200 dark:border-zinc-800"
 >
 <User className="h-4 w-4" />
 My Profile
 </Link>
 {onSignOut && (
 <button
 onClick={() => {
 onSignOut();
 setMobileMenuOpen(false);
 }}
 className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-500 border border-zinc-200 dark:border-zinc-800"
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
 className="mx-4 px-6 py-3 rounded-lg font-semibold text-sm text-center bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
 >
 Sign In
 </Link>
 )}
 </div>
 </div>
 )}
 </div>
 </nav >
 );
}