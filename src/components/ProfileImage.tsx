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
    return (
        <div
            className={cn(
                "relative overflow-hidden bg-gray-200 dark:bg-zinc-800",
                "flex items-center justify-center text-gray-500 dark:text-gray-400",
                className
            )}
            style={!fill && width && height ? { width, height } : undefined}
        >
            {src ? (
                <Image
                    src={src}
                    alt={alt || "Profile"}
                    width={width || (fill ? undefined : 40)}
                    height={height || (fill ? undefined : 40)}
                    fill={fill}
                    priority={priority}
                    className="object-cover"
                    {...props}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-medium text-sm">
                        {fallback ? fallback.slice(0, 2).toUpperCase() : <User className="w-3/5 h-3/5 md:w-1/2 md:h-1/2" strokeWidth={1.5} />}
                    </span>
                </div>
            )}
        </div>
    );
}
