"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Bell, Check, X, UserPlus, MessageSquare, ThumbsUp, Users,
    FileText, Trash2, MailOpen, Clock
} from "lucide-react";
import { api } from "@/app/_trpc/client";
import Link from "next/link";
import { ProfileImage } from "./ProfileImage";
import { cn } from "@/lib/utils";

// Notification type for TypeScript
interface NotificationData {
    id: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
    data: Record<string, unknown> | null;
    actor: {
        id: string;
        name: string | null;
        image: string | null;
    } | null;
}

// Helper to format time ago
function timeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
}

// Get notification icon based on type
function getNotificationIcon(type: string) {
    switch (type) {
        case "FRIEND_REQUEST_RECEIVED":
        case "FRIEND_REQUEST_ACCEPTED":
            return <UserPlus className="h-4 w-4" />;
        case "COMMENT_ON_NOTE":
        case "REPLY_TO_COMMENT":
            return <MessageSquare className="h-4 w-4" />;
        case "VOTES_ON_NOTE":
            return <ThumbsUp className="h-4 w-4" />;
        case "GROUP_INVITE":
        case "NOTE_SHARED_TO_GROUP":
            return <Users className="h-4 w-4" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

// Get notification color/theme based on type
function getNotificationColor(type: string) {
    switch (type) {
        case "FRIEND_REQUEST_RECEIVED":
        case "FRIEND_REQUEST_ACCEPTED":
            return "bg-blue-500/10 text-blue-500";
        case "COMMENT_ON_NOTE":
        case "REPLY_TO_COMMENT":
            return "bg-purple-500/10 text-purple-500";
        case "VOTES_ON_NOTE":
            return "bg-orange-500/10 text-orange-500";
        case "GROUP_INVITE":
            return "bg-green-500/10 text-green-500";
        default:
            return "bg-gray-500/10 text-gray-500";
    }
}

// Get notification message based on type
function getNotificationMessage(notification: NotificationData): string {
    const actorName = notification.actor?.name || "Someone";
    const data = notification.data as Record<string, string | number> | null;

    switch (notification.type) {
        case "FRIEND_REQUEST_RECEIVED":
            return `${actorName} sent you a friend request`;
        case "FRIEND_REQUEST_ACCEPTED":
            return `${actorName} accepted your friend request`;
        case "COMMENT_ON_NOTE":
            return `${actorName} commented on "${data?.noteTitle || "your note"}"`;
        case "REPLY_TO_COMMENT":
            return `${actorName} replied to your comment`;
        case "VOTES_ON_NOTE":
            const voteCount = data?.voteCount ?? 1;
            if (voteCount === 1) {
                return `${actorName} liked "${data?.noteTitle || "your note"}"`;
            }
            return `${voteCount} people liked "${data?.noteTitle || "your note"}"`;
        case "GROUP_INVITE":
            return `${actorName} added you to "${data?.groupName || "a group"}"`;
        case "NOTE_SHARED_TO_GROUP":
            return `New note shared in "${data?.groupName || "a group"}"`;
        default:
            return "You have a new notification";
    }
}

function getNotificationLink(notification: NotificationData): string {
    const data = notification.data as Record<string, string | number> | null;
    switch (notification.type) {
        case "FRIEND_REQUEST_RECEIVED":
        case "FRIEND_REQUEST_ACCEPTED":
            return `/social`;
        case "COMMENT_ON_NOTE":
        case "REPLY_TO_COMMENT":
        case "VOTES_ON_NOTE":
            return data?.noteId ? `/notes/${data.noteId}` : "#";
        case "GROUP_INVITE":
        case "NOTE_SHARED_TO_GROUP":
            return `/social`;
        default:
            return "#";
    }
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastPollTime = useRef<Date>(new Date());

    // --- Queries ---
    const { data: unreadCountData, refetch: refetchCount } = api.notifications.getUnreadCount.useQuery(
        undefined,
        { refetchInterval: 30000 }
    );

    const { data: notificationsData, refetch: refetchNotifications } = api.notifications.getAll.useQuery(
        { limit: 20 },
        { enabled: isOpen }
    );

    const { data: recentData } = api.notifications.getRecent.useQuery(
        { since: lastPollTime.current },
        { refetchInterval: 10000, enabled: true }
    );

    useEffect(() => {
        if (recentData && recentData.length > 0) {
            lastPollTime.current = new Date();
            refetchCount();
            if (isOpen) refetchNotifications();
        }
    }, [recentData, isOpen, refetchCount, refetchNotifications]);

    const markAsReadMutation = api.notifications.markAsRead.useMutation({
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
        }
    });

    const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation({
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
        }
    });

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = useCallback((notification: NotificationData) => {
        if (!notification.isRead) {
            markAsReadMutation.mutate({ notificationId: notification.id });
        }
        setIsOpen(false);
    }, [markAsReadMutation]);

    const unreadCount = unreadCountData?.count ?? 0;
    const allNotifications = (notificationsData?.notifications ?? []) as NotificationData[];

    // Filter based on tab
    const displayedNotifications = activeTab === "unread"
        ? allNotifications.filter((n) => !n.isRead)
        : allNotifications;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-full backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95]",
                    isOpen
                        ? "from-orange-400/20 via-pink-400/15 to-purple-400/20 text-orange-600 border-orange-300/50"
                        : "hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 text-gray-700 dark:text-gray-200"
                )}
                aria-label="Notifications"
            >
                <Bell className={cn("h-5 w-5 transition-transform duration-500", isOpen && "rotate-12")} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 text-[10px] items-center justify-center text-white font-bold border-2 border-white dark:border-zinc-950 shadow-sm">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-4 w-96 max-w-[90vw] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] ring-1 ring-black/5 z-50 transform origin-top-right animate-in fade-in zoom-in-95 duration-300 overflow-hidden">

                    {/* Header */}
                    <div className="p-4 border-b border-white/20 dark:border-white/10 flex items-center justify-between bg-white/40 dark:bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg tracking-tight">Notifications</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-500/20">
                                {unreadCount} New
                            </span>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsReadMutation.mutate()}
                                disabled={markAllAsReadMutation.isPending}
                                className="text-xs font-semibold text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/50 dark:hover:bg-white/10 ml-auto"
                            >
                                <MailOpen className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="px-4 pt-2 -mb-px flex gap-6 border-b border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md">
                        {['all', 'unread'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={cn(
                                    "pb-3 text-sm font-bold transition-all relative capitalize",
                                    activeTab === tab
                                        ? "text-orange-600 dark:text-orange-400"
                                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                )}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 bg-white/30 dark:bg-zinc-900/30">
                        {displayedNotifications.length === 0 ? (
                            <div className="py-12 px-6 text-center">
                                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-white/50 to-white/10 dark:from-white/10 dark:to-transparent backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/20 shadow-lg">
                                    <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 opacity-50" />
                                </div>
                                <h4 className="text-gray-900 dark:text-gray-200 font-bold mb-1">No notifications</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {activeTab === 'unread' ? "You're all caught up!" : "You have no notifications yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayedNotifications.map((notification) => (
                                    <Link
                                        key={notification.id}
                                        href={getNotificationLink(notification as NotificationData)}
                                        onClick={() => handleNotificationClick(notification as NotificationData)}
                                        className={cn(
                                            "group block p-3 rounded-xl transition-all duration-200 relative overflow-hidden backdrop-blur-sm",
                                            !notification.isRead
                                                ? "bg-orange-50/80 dark:bg-orange-500/10 hover:bg-orange-100/80 dark:hover:bg-orange-500/20 border border-orange-200/50 dark:border-orange-500/20"
                                                : "hover:bg-white/40 dark:hover:bg-white/5 border border-transparent hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            {/* Avatar/Icon */}
                                            <div className="flex-shrink-0 pt-1">
                                                {notification.actor ? (
                                                    <ProfileImage
                                                        src={notification.actor.image}
                                                        alt={notification.actor.name || "User"}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full ring-2 ring-white/50 dark:ring-white/10 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-full flex items-center justify-center shadow-lg border border-white/20",
                                                        getNotificationColor(notification.type)
                                                    )}>
                                                        {getNotificationIcon(notification.type)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className={cn(
                                                    "text-sm leading-snug break-words",
                                                    !notification.isRead ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-300"
                                                )}>
                                                    {getNotificationMessage(notification as NotificationData)}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(notification.createdAt)}
                                                </div>
                                            </div>

                                            {/* Status Dot */}
                                            {!notification.isRead && (
                                                <div className="flex-shrink-0 pt-2">
                                                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] ring-2 ring-white dark:ring-zinc-950" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
