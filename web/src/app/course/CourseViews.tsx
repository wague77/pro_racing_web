"use client";

import React from "react";
import { EmptyState } from "@/components/ui";

const CAT: Record<string, { color: string; bg: string; label: string }> = {
  favori: { color: "#0A7A42", bg: "#E6F4EC", label: "Favori" },
  outsider: { color: "#B45309", bg: "#FEF3C7", label: "Outsider" },
  tocard: { color: "#B91C1C", bg: "#FEE2E2", label: "Tocard" },
  inconnu: { color: "#6B7280", bg: "#F1F1F3", label: "—" },
};
export const cat = (k?: string) => CAT[k || "inconnu"] || CAT.inconnu;

const SIGNAL: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  jouer: { color: "#0A7A42", bg: "#E6F4EC", label: "À jouer", icon: "trending-down" },
  surveiller: { color: "#1D4ED8", bg: "#DBEAFE", label: "À surveiller", icon: "eye-outline" },
  eviter: { color: "#B91C1C", bg: "#FEE2E2", label: "À éviter", icon: "trending-up" },
  neutre: { color: "#6B7280", bg: "#F1F1F3", label: "Neutre", icon: "remove-outline" },
};

export function CoupHorse({ pos, h, onHorseClick }: { pos: number; h: any; onHorseClick?: (part: any) => void }) {
  return (
    <div className="flex flex-row items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-[#EBEBEF] flex items-center justify-center">
        <span className="text-[11px] font-extrabold text-[#8E8E93]">{pos}</span>
      </div>
      <div className="w-7 h-7 rounded-lg bg-[#E6F4EA] flex items-center justify-center">
        <span className="text-base font-extrabold text-[#10B981]">{h.numPmu}</span>
      </div>
      <span 
        className="flex-1 text-base font-bold text-[#1C1C1E] truncate hover:text-[#10B981] hover:underline cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onHorseClick && onHorseClick(h); }}
      >
        {h.nom}
      </span>
      {h.coteDirect != null && <span className="text-base font-extrabold text-[#1C1C1E]">{h.coteDirect}</span>}
    </div>
  );
}

export function CouplesView({ analysis, onHorseClick }: { analysis: any[]; participants: any[]; onHorseClick?: (part: any) => void }) {
  const ranked = analysis;
  const PAIRS: [number, number][] = [
    [1, 3],
    [1, 5],
    [1, 4],
    [2, 3],
    [2, 4],
    [2, 6],
  ];
  const combos = PAIRS.map(([a, b]) => ({ a, b, ha: ranked[a - 1], hb: ranked[b - 1] })).filter(
    (x) => x.ha && x.hb
  );

  if (!ranked.length) {
    return (
      <EmptyState
        icon="GitCompare"
        title="Couplés indisponibles"
        subtitle="Cotes non disponibles pour cette course."
      />
    );
  }

  return (
    <div className="p-5 pb-10 flex flex-col gap-4">
      <div className="flex flex-row items-center gap-4 bg-[#E6F4EA] rounded-md p-4">
        <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">90%</span>
        </div>
        <p className="text-sm text-[#0A7A42] font-semibold leading-relaxed">
          Couplés basés sur le classement des cotes (favoris en premier). Positions jouées : 1-3,
          1-5, 1-4, 2-3, 2-4, 2-6.
        </p>
      </div>

      {combos.map(({ a, b, ha, hb }) => (
        <div key={`${a}-${b}`} className="flex flex-row items-center gap-4 bg-white rounded-md p-4 shadow-sm">
          <div className="w-12 h-12 rounded-md bg-[#10B981] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-lg">{a}-{b}</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <CoupHorse pos={a} h={ha} onHorseClick={onHorseClick} />
            <div className="h-px bg-[#E5E5EA] w-full" />
            <CoupHorse pos={b} h={hb} onHorseClick={onHorseClick} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CotesView({ analysis, onHorseClick }: { analysis: any[]; participants: any[]; onHorseClick?: (part: any) => void }) {
  // We don't have aJouer directly here anymore, we'll extract it if needed or just skip it since analysis is enough
  // Let's compute aJouer locally if needed
  const aJouer = analysis.filter(a => a.signal === "jouer").map(a => a.numPmu);
  if (!analysis || analysis.length === 0) {
    return (
      <EmptyState
        icon="TrendingDown"
        title="Analyse des cotes indisponible"
        subtitle="Les cotes ne sont pas encore publiées pour cette course."
      />
    );
  }
  return (
    <div className="p-5 pb-10 flex flex-col gap-4">
      <div className="flex flex-row items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <span className="text-[#8E8E93] text-sm font-semibold">Cote matin → cote directe → projection au départ</span>
      </div>

      {aJouer.length > 0 && (
        <div className="bg-[#10B981] rounded-md p-4 shadow-sm mb-2">
          <div className="flex flex-row items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            <h3 className="text-white font-extrabold text-base">Numéros à jouer</h3>
          </div>
          <p className="text-white/90 text-sm mt-1 mb-3">Cotes en baisse marquée + bon profil IA (l&apos;argent rentre)</p>
          <div className="flex flex-row flex-wrap gap-2">
            {aJouer.map((n) => (
              <div key={n} className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.map((a) => {
        const sig = SIGNAL[a.signal] || SIGNAL.neutre;
        const c = cat(a.categorie);
        const up = a.direction === "hausse";
        const down = a.direction === "baisse";
        return (
          <div key={a.numPmu} className="flex flex-row items-center gap-4 bg-white rounded-md p-4 shadow-sm border-l-4" style={{ borderLeftColor: c.color }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
              <span className="font-extrabold text-lg" style={{ color: c.color }}>{a.numPmu}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span 
                className="text-base font-bold text-[#1C1C1E] truncate hover:text-[#10B981] hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onHorseClick && onHorseClick(a); }}
              >
                {a.nom}
              </span>
              <div className="flex flex-row items-center gap-1.5 flex-wrap">
                <span className="text-sm text-[#8E8E93] font-semibold line-through">
                  {a.coteReference != null ? a.coteReference.toFixed(1) : "—"}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                <span className="text-base text-[#1C1C1E] font-extrabold">
                  {a.coteDirect != null ? a.coteDirect.toFixed(1) : "—"}
                </span>
                {a.variation != null && (
                  <div className="flex flex-row items-center gap-0.5 px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: down ? "#E6F4EC" : up ? "#FEE2E2" : "#F1F1F3" }}>
                    {down ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#0A7A42"><polygon points="12,20 4,8 20,8" /></svg>
                    ) : up ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#B91C1C"><polygon points="12,4 4,16 20,16" /></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    )}
                    <span className="text-sm font-extrabold" style={{ color: down ? "#0A7A42" : up ? "#B91C1C" : "#6B7280" }}>
                      {Math.abs(a.variation)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-row items-center gap-1 self-start px-2 py-1 rounded-full mt-1" style={{ backgroundColor: sig.bg }}>
                <span className="text-sm font-bold" style={{ color: sig.color }}>{sig.label}</span>
              </div>
            </div>
            <div className="flex flex-col items-center min-w-[52px] shrink-0">
              <span className="text-xl font-extrabold text-[#059669]">{a.coteCible != null ? a.coteCible.toFixed(1) : "—"}</span>
              <span className="text-[10px] text-[#8E8E93] font-semibold uppercase">cote cible</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
