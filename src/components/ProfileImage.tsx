"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageProps extends Omit<ImageProps, "src" | "alt"> {
    src?: string | null;
    alt?: string | null;
    fallback?: string; // Text for initials fallback if needed
    className?: string;
    width?: number; // Optional explicit width if not filling layout
    height?: number; // Optional explicit height if not filling layout
}

export function ProfileImage({
    src,
    alt,
    fallback,
    className,
    width,
    height,
    fill,
    priority,
    ...props
}: ProfileImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Reset error state when src changes
    useEffect(() => {
        setHasError(false);
        setIsLoading(true);
    }, [src]);

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleError = (e: any) => {
        // Only trigger error if we actually have a src
        if (src) {
            setHasError(true);
            setIsLoading(false);
        }
    };

    // Derived state logic
    const showFallback = !src || hasError;
    const isPrivateIp = typeof src === "string" && !!src.match(/^(http:\/\/)?(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);

    // Explicitly force unoptimized if it's a private IP to avoid SSRF protection errors on server
    const shouldBeUnoptimized = props.unoptimized || isPrivateIp;

    const initials = fallback
        ? fallback.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
        : null;

    return (
        <div
            className={cn(
                "relative overflow-hidden bg-gray-100 dark:bg-zinc-800",
                "flex items-center justify-center text-gray-400 dark:text-gray-500",
                className
            )}
            style={!fill && width && height ? { width, height } : undefined}
        >
            {!showFallback && src && (
                <Image
                    src={src}
                    alt={alt || "Profile"}
                    className={cn(
                        "object-cover transition-opacity duration-500",
                        isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100"
                    )}
                    onLoad={handleLoad}
                    onError={handleError}
                    fill={fill}
                    width={!fill ? width : undefined}
                    height={!fill ? height : undefined}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={priority}
                    {...props}
                    unoptimized={shouldBeUnoptimized}
                />
            )}

            {/* Fallback View */}
            {showFallback && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 animate-in fade-in duration-300">
                    {initials ? (
                        <span className="font-bold text-gray-500 dark:text-gray-400 select-none" style={{ fontSize: '40%' }}>
                            {initials}
                        </span>
                    ) : (
                        <User className="w-1/2 h-1/2" />
                    )}
                </div>
            )}

            {/* Loading Skeleton Overlay */}
            {isLoading && !hasError && src && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-700 animate-pulse" />
            )}
        </div>
    );
}
