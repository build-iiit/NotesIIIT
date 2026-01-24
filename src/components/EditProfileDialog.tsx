"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/_trpc/client";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface EditProfileDialogProps {
    user: {
        id: string;
        name: string | null;
        image: string | null;
        backgroundImage: string | null;
    };
    onClose: () => void;
}

export function EditProfileDialog({ user, onClose }: EditProfileDialogProps) {
    const router = useRouter();
    const [name, setName] = useState(user.name || "");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
    const [backgroundPreview, setBackgroundPreview] = useState<string | null>(user.backgroundImage);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for file inputs
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);

    const getUploadUrlMutation = api.auth.getProfileUploadUrl.useMutation();
    const updateProfileMutation = api.auth.updateProfile.useMutation();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            // Validate file size (5MB max for avatars)
            if (file.size > 5 * 1024 * 1024) {
                setError('Avatar image must be less than 5MB');
                return;
            }

            setError(null);
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            // Validate file size (10MB max for backgrounds)
            if (file.size > 10 * 1024 * 1024) {
                setError('Background image must be less than 10MB');
                return;
            }

            setError(null);
            setBackgroundFile(file);
            setBackgroundPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);
            let newAvatarKey = undefined;
            let newBackgroundKey = undefined;

            // 1. Upload Avatar if changed
            if (avatarFile) {
                try {
                    const { url, s3Key } = await getUploadUrlMutation.mutateAsync({
                        filename: avatarFile.name,
                        contentType: avatarFile.type,
                        type: "avatar",
                    });

                    const uploadResponse = await fetch(url, {
                        method: "PUT",
                        body: avatarFile,
                        headers: { "Content-Type": avatarFile.type },
                    });

                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        console.error("Avatar upload failed:", uploadResponse.status, errorText);
                        throw new Error(`Failed to upload avatar: ${uploadResponse.status} ${uploadResponse.statusText}`);
                    }
                    newAvatarKey = s3Key;
                } catch (err) {
                    setError('Failed to upload profile photo. Please try again.');
                    setIsSaving(false);
                    return;
                }
            }

            // 2. Upload Background if changed
            if (backgroundFile) {
                try {
                    const { url, s3Key } = await getUploadUrlMutation.mutateAsync({
                        filename: backgroundFile.name,
                        contentType: backgroundFile.type,
                        type: "background",
                    });

                    const uploadResponse = await fetch(url, {
                        method: "PUT",
                        body: backgroundFile,
                        headers: { "Content-Type": backgroundFile.type },
                    });

                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        console.error("Background upload failed:", uploadResponse.status, errorText);
                        throw new Error(`Failed to upload background: ${uploadResponse.status} ${uploadResponse.statusText}`);
                    }
                    newBackgroundKey = s3Key;
                } catch (err) {
                    setError('Failed to upload background image. Please try again.');
                    setIsSaving(false);
                    return;
                }
            }

            // 3. Update Profile
            try {
                await updateProfileMutation.mutateAsync({
                    name: name !== user.name ? name : undefined,
                    image: newAvatarKey,
                    backgroundImage: newBackgroundKey,
                });

                router.refresh();
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save profile changes. Please try again.');
                setIsSaving(false);
            }
        } catch (error) {
            console.error("Failed to update profile:", error);
            setError('An unexpected error occurred. Please try again.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header Preview Section */}
                <div className="relative h-32 bg-gray-100 dark:bg-zinc-800">
                    {backgroundPreview ? (
                        <Image
                            src={backgroundPreview}
                            alt="Background Cover"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600" />
                    )}

                    <button
                        onClick={() => backgroundInputRef.current?.click()}
                        className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-all"
                        title="Change Cover Photo"
                    >
                        <ImageIcon size={18} />
                    </button>
                    <input
                        type="file"
                        ref={backgroundInputRef}
                        hidden
                        accept="image/*"
                        onChange={handleBackgroundChange}
                    />
                </div>

                {/* Avatar Section (Overlapping) */}
                <div className="px-6 relative">
                    <div className="absolute -top-12 left-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-900 overflow-hidden bg-white dark:bg-zinc-800 relative shadow-lg">
                                <Image
                                    src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white transition-all rounded-full m-1 backdrop-blur-sm cursor-pointer hover:scale-[1.05]"
                                title="Change Profile Photo"
                            >
                                <Camera size={24} />
                            </button>
                            <input
                                type="file"
                                ref={avatarInputRef}
                                hidden
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>
                    </div>

                    <div className="pt-16 pb-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Profile</h2>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Your name"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 relative backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] hover:from-orange-400/20 hover:via-pink-400/15 hover:to-purple-400/20 transition-all duration-500 shadow-[0_8px_24px_0_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.3)] border border-white/25 hover:border-orange-300/50 hover:scale-[1.08] active:scale-[0.95] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
