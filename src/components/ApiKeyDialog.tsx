"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { Key, Loader2, Shield, X, ExternalLink } from "lucide-react";

interface ApiKeyDialogProps {
    onClose: () => void;
    onSave?: () => void;
}

export function ApiKeyDialog({ onClose, onSave }: ApiKeyDialogProps) {
    const [apiKey, setApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const utils = api.useUtils();
    const updateApiKeyMutation = api.auth.updateGeminiApiKey.useMutation();

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setError("Please enter your API key");
            return;
        }

        try {
            setIsSaving(true);
            setError(null);
            await updateApiKeyMutation.mutateAsync({ apiKey: apiKey.trim() });
            // Invalidate models query to fetch fresh list with new key
            utils.ai.getAvailableModels.invalidate();
            onSave?.();
            onClose();
        } catch (err) {
            console.error("Failed to save API key:", err);
            setError(err instanceof Error ? err.message : "Failed to save API key");
            setIsSaving(false);
        }
    };

    const handleSkip = () => {
        // Store in localStorage that user skipped - so we don't show again until they try to use AI
        localStorage.setItem("gemini-api-key-skipped", "true");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">

                {/* Header */}
                <div className="relative p-6 pb-4 bg-gradient-to-br from-orange-500/20 via-pink-500/20 to-purple-500/20 dark:from-orange-900/30 dark:via-purple-900/30 dark:to-black/30">
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/30 to-pink-500/30 border border-white/20">
                            <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Your Privacy Matters
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                AI-powered features setup
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/30">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            <strong className="text-blue-600 dark:text-blue-400">We respect your privacy.</strong> NotesIIIT uses AI to help you understand your documents. To ensure your questions and document contents stay completely private, you can use your own Gemini API key.
                        </p>
                    </div>

                    {/* Instructions Panel */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30">
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                            📋 How to get your free API key
                        </h3>
                        <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                            <li>
                                Visit{" "}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
                                >
                                    Google AI Studio
                                </a>
                            </li>
                            <li>Sign in with your Google account</li>
                            <li>Click <strong>"Create API Key"</strong></li>
                            <li>Copy the generated key (starts with <code className="px-1 py-0.5 rounded bg-white/50 dark:bg-black/30 text-xs">AIzaSy...</code>)</li>
                            <li>Paste it below and click "Save & Continue"</li>
                        </ol>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 flex items-center gap-1">
                            💡 <span>It's completely free for personal use!</span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Your Gemini API Key
                            </label>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                            >
                                Get free API key
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isSaving) {
                                        handleSave();
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="AIzaSy..."
                            />
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/30">
                        <p className="text-xs text-green-700 dark:text-green-400">
                            🔒 <strong>Your key stays with you.</strong> All AI queries will use your personal key, ensuring your prompts and document contents are not shared with our servers.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                            disabled={isSaving}
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !apiKey.trim()}
                            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                            Save & Continue
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-500 dark:text-gray-500 pt-2">
                        You can update your API key anytime from your profile settings.
                    </p>
                </div>
            </div>
        </div>
    );
}
