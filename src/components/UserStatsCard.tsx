import { LucideIcon } from "lucide-react";

interface UserStatsCardProps {
    icon: LucideIcon;
    value: number | string;
    label: string;
    gradientFrom?: string;
    gradientTo?: string;
}

export function UserStatsCard({
    icon: Icon,
    value,
    label,
    gradientFrom = "blue-500",
    gradientTo = "indigo-600",
}: UserStatsCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border border-white/20 hover:border-orange-300/30 p-6 shadow-lg hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.2)] transition-all duration-300 hover:-translate-y-1">
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br from-${gradientFrom}/5 to-${gradientTo}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br from-${gradientFrom} to-${gradientTo} shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Decorative blur */}
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${gradientFrom}/10 rounded-full blur-2xl group-hover:bg-${gradientFrom}/20 transition-all duration-300`} />
                </div>

                <div className="space-y-1">
                    <div className={`text-3xl font-bold bg-gradient-to-r from-${gradientFrom} to-${gradientTo} bg-clip-text text-transparent`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        {label}
                    </div>
                </div>
            </div>
        </div>
    );
}
