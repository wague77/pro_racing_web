import React from "react";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { T } from "@/lib/theme";

export function Loader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 flex-1">
      <Loader2 className="animate-spin" size={32} color={T.color.brand} />
      <p className="mt-4 text-[14px] text-[#8E8E93] font-semibold">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  icon,
  onRetry,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onRetry?: () => void;
}) {
  const IconComponent = icon ? (LucideIcons as any)[icon] || LucideIcons.Info : LucideIcons.Info;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 flex-1 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EBEBEF] flex items-center justify-center mb-6">
        <IconComponent size={32} color={T.color.muted} />
      </div>
      <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{title}</h3>
      {subtitle && <p className="text-base text-[#8E8E93] leading-relaxed mb-6">{subtitle}</p>}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-[#EBEBEF] text-[#1C1C1E] px-6 py-3 rounded-xl font-bold transition-colors hover:bg-[#E5E5EA]"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Tag({ text, tone }: { text: string; tone?: "brand" | "warn" | "default" }) {
  const bg = tone === "brand" ? "bg-[#E6F4EA] text-[#0A7A42]" : tone === "warn" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#EBEBEF] text-[#3A3A3C]";
  return <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${bg}`}>{text}</span>;
}

export function OddsBadge({ cote, tendance }: { cote?: number; tendance?: string }) {
  if (cote == null) return null;
  const tColor = tendance === "baisse" ? "text-[#10B981]" : tendance === "hausse" ? "text-[#E11D48]" : "text-[#8E8E93]";
  return (
    <div className="flex items-center gap-1 bg-[#F7F7F9] px-2 py-1 rounded-md">
      <span className={`font-black text-[14px] ${tColor}`}>{cote.toFixed(1)}</span>
    </div>
  );
}
