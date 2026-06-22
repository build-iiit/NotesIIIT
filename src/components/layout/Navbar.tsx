"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { ThemeToggle } from'@/components/ui/ThemeToggle';
import {
 BookOpen, Menu, X, Upload,
 User, LogOut, Home, Shield, Search,
 Bookmark, Folder, Users, PenSquare
} from"lucide-react";
import { useState } from"react";
import { ProfileImage } from'@/components/ui/ProfileImage';

import { api } from"@/app/_trpc/client";
import { signOut } from"next-auth/react";

export function Navbar() {
 const { data: user } = api.auth.getMe.useQuery(undefined, {
 refetchOnWindowFocus: false,
 });

 const onSignOut = user ? () => signOut() : undefined;
 const pathname = usePathname();
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 const navLinks = [
 { href:"/", label:"Home", icon: Home },
 { href:"/markdown/new", label:"Note", icon: PenSquare, authRequired: true },
 { href:"/upload", label:"Upload", icon: Upload, authRequired: true },
 { href:"/my-files", label:"Folders", icon: Folder, authRequired: true },
 { href:"/social", label:"Social", icon: Users },
 ...(user?.role ==="ADMIN" ? [{ href:"/admin", label:"Admin", icon: Shield, adminOnly: true }] : []),
 { href:"/search", label:"Search", icon: Search },
 ];

 const isActive = (path: string) => {
 if (!pathname) return false;
 if (path ==="/") return pathname === path;
 return pathname.startsWith(path);
 };

 return (
 <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 border-b border-border">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-16 gap-4">
 {/* Logo */}
 <Link href="/" className="flex items-center gap-2 group shrink-0">
 <BookOpen className="h-8 w-8 text-primary transition-transform group-hover:rotate-12 duration-300" />
 <span className="text-xl font-bold text-primary hidden sm:block">
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
 flex items-center gap-2
 ${active
 ?"text-primary font-bold bg-primary/10"
 :"text-muted-foreground hover:text-primary hover:bg-primary/5"
 }
 `}
 >
 <Icon className={`h-4 w-4 ${active ?"text-primary" :""}`} />
 {link.label}
 {active && (
 <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-primary rounded-full" />
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
 className={`p-2 rounded-lg transition-all duration-200 border ${isActive("/bookmarks")
 ?"bg-primary/10 border-primary/30 text-primary"
 :"border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
 }`}
 aria-label="Bookmarks"
 >
 <Bookmark className="h-5 w-5" />
 </Link>
 )}
 <ThemeToggle />
 {user ? (
 <div className="flex items-center gap-3">
 <Link
 href={`/users/${user.id}`}
 className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary/50 transition-all duration-200"
 aria-label="View Profile"
 >
 <ProfileImage
 src={user.image}
 alt={user.name ||"Profile"}
 fallback={user.name ||"User"}
 width={36}
 height={36}
 className="w-10 h-10 rounded-full"
 />
 <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background z-10" />
 </Link>

 {onSignOut && (
 <button
 onClick={onSignOut}
 className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all duration-200 border border-destructive/20"
 >
 <LogOut className="h-4 w-4" />
 <span className="hidden lg:inline">Sign Out</span>
 </button>
 )}
 </div>
 ) : (
 <Link
 href="/login"
 className="px-6 py-2 rounded-lg font-semibold text-sm text-primary-foreground bg-primary hover:opacity-90 transition-all duration-200"
 >
 Sign In
 </Link>
 )}
 </div>

 {/* Mobile menu button */}
 <button
 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
 className="md:hidden p-2 rounded-lg bg-secondary text-foreground transition-all duration-200 border border-border ml-auto"
 aria-label="Toggle menu"
 >
 {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
 </button>
 </div>

 {/* Mobile Navigation Menu */}
 {mobileMenuOpen && (
 <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top duration-200">
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
 ?"bg-primary/10 text-primary font-bold"
 :"text-foreground hover:bg-secondary"
 }
 `}
 >
 <Icon className="h-5 w-5" />
 {link.label}
 </Link>
 );
 })}

 <div className="border-t border-border my-2" />

 <div className="px-4 py-3 flex items-center justify-between bg-secondary rounded-lg">
 <span className="text-sm font-medium">Theme</span>
 <ThemeToggle />
 </div>

 {user && (
 <Link
 href="/bookmarks"
 onClick={() => setMobileMenuOpen(false)}
 className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${isActive("/bookmarks")
 ?"bg-primary/10 text-primary font-bold"
 :"text-foreground hover:bg-secondary"
 }`}
 >
 <Bookmark className="h-5 w-5" />
 Bookmarks
 </Link>
 )}

 {user ? (
 <div className="px-4 py-3 space-y-2">
 <div className="flex items-center gap-2 text-sm bg-secondary rounded-lg p-2">
 <div className="h-2 w-2 rounded-full bg-green-500" />
 Signed in as {user.name}
 </div>

 <Link
 href={`/users/${user.id}`}
 onClick={() => setMobileMenuOpen(false)}
 className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-accent transition-all duration-200"
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
 className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all duration-200"
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
 className="mx-4 px-6 py-3 rounded-lg font-semibold text-sm text-center text-primary-foreground bg-primary hover:opacity-90 transition-all duration-200"
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