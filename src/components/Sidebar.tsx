"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Bookmark,
  User,
  LogOut,
  FolderOpen,
  LayoutDashboard
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./NotificationBell";

interface SidebarProps {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home", icon: Home, exact: true },
    { href: "/search", label: "Search", icon: Search },
    { href: "/my-files", label: "My Files", icon: FolderOpen, authRequired: true },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, authRequired: true },
    { href: "/admin", label: "Admin", icon: LayoutDashboard, authRequired: true, roleRequired: true }, // We'll ignore role check for simplicity in UI if needed, but standardizing.
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border flex flex-col z-50">
      {/* Brand */}
      <div className="p-6 h-16 flex items-center mb-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          iiit<span className="font-light">Notes</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          if (link.authRequired && !user) return null;

          const Icon = link.icon;
          const active = isActive(link.href, link.exact);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border flex flex-col gap-4">
        {user ? (
          <>
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <Link
              href={`/users/${user.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="truncate">{user.name || "Profile"}</span>
            </Link>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-3">
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-4 py-2 w-full rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
