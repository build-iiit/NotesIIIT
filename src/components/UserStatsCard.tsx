import { LucideIcon } from"lucide-react";

interface UserStatsCardProps {
 icon: LucideIcon;
 value: number | string;
 label: string;
}

export function UserStatsCard({
 icon: Icon,
 value,
 label,
}: UserStatsCardProps) {
 return (
 <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border border-white/20 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_16px_40px_0_var(--glow-color)]">
 {/* Gradient background on hover */}
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5" />

 {/* Content */}
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-4">
 <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-white">
 <Icon className="h-6 w-6 text-white" />
 </div>

 {/* Decorative blur */}
 <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all duration-300 bg-primary/10 group-hover:bg-primary/20 pointer-events-none" />
 </div>

 <div className="space-y-1">
 <div className="text-3xl font-bold text-primary">
 {typeof value ==='number' ? value.toLocaleString() : value}
 </div>
 <div className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
 {label}
 </div>
 </div>
 </div>
 </div>
 );
}
