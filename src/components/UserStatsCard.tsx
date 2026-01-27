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
    const isMonochrome = gradientFrom === "primary";

    return (
        <div className={`group relative overflow-hidden rounded-2xl backdrop-blur-3xl bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.06] border border-white/20 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 ${isMonochrome ? "hover:border-primary/50 hover:shadow-primary/20" : "hover:border-orange-300/30 hover:shadow-[0_16px_40px_0_rgba(251,146,60,0.2)]"}`}>
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isMonochrome ? "bg-primary/5" : `bg-gradient-to-br from-${gradientFrom}/5 to-${gradientTo}/5`}`} />

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl shadow-lg ${isMonochrome ? "bg-primary text-primary-foreground" : `bg-gradient-to-br from-${gradientFrom} to-${gradientTo}`}`}>
                        <Icon className={`h-6 w-6 ${isMonochrome ? "text-primary-foreground" : "text-white"}`} />
                    </div>

                    {/* Decorative blur */}
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all duration-300 ${isMonochrome ? "bg-primary/10 group-hover:bg-primary/20" : `bg-${gradientFrom}/10 group-hover:bg-${gradientFrom}/20`}`} />
                </div>

                <div className="space-y-1">
                    <div className={`text-3xl font-bold ${isMonochrome ? "text-primary" : `bg-gradient-to-r from-${gradientFrom} to-${gradientTo} bg-clip-text text-transparent`}`}>
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
