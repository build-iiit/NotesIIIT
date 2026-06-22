"use client";

import { useState } from"react";
import { api } from"@/app/_trpc/client";
import { Key, Loader2, Shield, X, ExternalLink } from"lucide-react";

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
 setError(err instanceof Error ? err.message :"Failed to save API key");
 setIsSaving(false);
 }
 };

 const handleSkip = () => {
 // Store in localStorage that user skipped - so we don't show again until they try to use AI
 localStorage.setItem("gemini-api-key-skipped","true");
 onClose();
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
 <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">

 {/* Header */}
 <div className="relative p-6 pb-4 bg-gradient-to-br from-[var(--brand-from)]/20 via-[var(--brand-via)]/20 to-[var(--brand-to)]/20 dark:from-[var(--brand-from)]/30 dark:via-[var(--brand-to)]/30 dark:to-black/30">
 <button
 onClick={handleSkip}
 className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
 aria-label="Close"
 >
 <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
 </button>

 <div className="flex items-center gap-3">
 <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
 <Shield className="h-6 w-6 text-primary" />
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
 <div className="p-4 rounded-xl bg-white/40 dark:bg-zinc-800/40 border border-white/20 dark:border-white/5">
 <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
 <strong className="text-primary">We respect your privacy.</strong> NotesIIIT uses AI to help you understand your documents. To ensure your questions and document contents stay completely private, you can use your own Gemini API key.
 </p>
 </div>

 {/* Instructions Panel */}
 <div className="p-4 rounded-xl bg-white/40 dark:bg-zinc-800/40 border border-white/20 dark:border-white/5">
 <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
 📋 How to get your free API key
 </h3>
 <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
 <li>
 Visit{""}
 <a
 href="https://aistudio.google.com/apikey"
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline font-medium"
 >
 Google AI Studio
 </a>
 </li>
 <li>Sign in with your Google account</li>
 <li>Click <strong>&quot;Create API Key&quot;</strong></li>
 <li>Copy the generated key (starts with <code className="px-1 py-0.5 rounded bg-white/50 dark:bg-black/30 text-xs">AIzaSy...</code>)</li>
 <li>Paste it below and click &quot;Save &amp; Continue&quot;</li>
 </ol>
 <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
 💡 <span>It&apos;s completely free for personal use!</span>
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
 className="flex items-center gap-1 text-xs text-primary hover:underline"
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
 if (e.key ==="Enter" && !isSaving) {
 handleSave();
 }
 }}
 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary outline-none transition-all"
 placeholder="AIzaSy..."
 />
 </div>
 </div>

 <div className="p-3 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10">
 <p className="text-xs text-primary">
 🔒 <strong>Your key stays with you.</strong> All AI queries will use your personal key, ensuring your prompts and document contents are not shared with our servers.
 </p>
 </div>

 {error && (
 <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
 <p className="text-sm text-destructive">{error}</p>
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
 className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
