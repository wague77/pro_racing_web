"use client";

import React from "react";
import { EmptyState } from "@/components/ui";
import { cat } from "./CourseViews";

function EcartTag({ pos, rank, light }: { pos?: number; rank: number; light?: boolean }) {
  if (!pos) return null;
  const d = pos - rank;
  const abs = Math.abs(d);
  const color = abs === 0 ? "#0A7A42" : abs <= 2 ? "#B45309" : "#B91C1C";
  const bg = abs === 0 ? "#E6F4EC" : abs <= 2 ? "#FEF3C7" : "#FEE2E2";
  
  const icon = d === 0 ? (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={light ? "#fff" : color} strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
  ) : d > 0 ? (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={light ? "#fff" : color} strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
  ) : (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={light ? "#fff" : color} strokeWidth="3"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
  );

  return (
    <div className="flex flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: light ? "rgba(255,255,255,0.22)" : bg }}>
      {icon}
      <span className="text-[10px] font-extrabold" style={{ color: light ? "#fff" : color }}>
        {abs === 0 ? "exact" : `écart ${abs}`}
      </span>
    </div>
  );
}

export function PronosticView({ selection, tocards, arrivee }: { selection: any[]; tocards: any[]; arrivee: any[] }) {
  if (!selection || selection.length === 0) {
    return (
      <EmptyState
        icon="LineChart"
        title="Pronostic indisponible"
        subtitle="Pas assez de données pour cette course."
      />
    );
  }
  
  const posByNum: Record<number, number> = {};
  arrivee.forEach((a) => {
    posByNum[a.numPmu] = a.ordre;
  });
  
  const finished = arrivee.length > 0;
  const [top, ...rest] = selection;

  const topPos = posByNum[top.numPmu];
  const trio = selection.slice(0, 3).map((s) => s.numPmu);
  const trioHits = trio.filter((n) => posByNum[n] && posByNum[n] <= 3).length;

  const top8 = selection.slice(0, 8);
  const ecarts = top8
    .map((s) => {
      const pos = posByNum[s.numPmu];
      return pos ? Math.abs(pos - s.rank) : null;
    })
    .filter((e): e is number => e !== null);
  const avgEcart = ecarts.length ? ecarts.reduce((a, b) => a + b, 0) / ecarts.length : null;

  return (
    <div className="p-5 pb-10 flex flex-col gap-4">
      {finished ? (
        <div className="bg-[#1C1C1E] rounded-xl p-5 shadow-sm text-white">
          <h3 className="font-extrabold text-lg mb-4">Bilan du pronostic IA</h3>
          <div className="flex flex-row items-center">
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="font-extrabold text-lg">
                {topPos === 1 ? "Gagné" : topPos && topPos <= 3 ? `Placé ${topPos}e` : "Non placé"}
              </span>
              <span className="text-sm text-white/70 text-center">Favori IA</span>
            </div>
            <div className="w-px h-11 bg-white/20" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="font-extrabold text-2xl">{trioHits}/3</span>
              <span className="text-sm text-white/70 text-center">Trio IA dans l&apos;arrivée</span>
            </div>
            <div className="w-px h-11 bg-white/20" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="font-extrabold text-2xl">{avgEcart != null ? avgEcart.toFixed(1) : "—"}</span>
              <span className="text-sm text-white/70 text-center">Écart moyen top 8</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M12 3v18M3 12h18m-4.5-4.5l-9 9m9 0l-9-9" /></svg>
          <span className="text-sm text-[#8E8E93] font-semibold">Sélection algorithmique · analyse pondérée</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-row gap-4 mb-2">
        {(["favori", "outsider", "tocard"] as const).map((k) => (
          <div key={k} className="flex flex-row items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat(k).color }} />
            <span className="text-sm text-[#8E8E93] font-semibold">{cat(k).label}</span>
          </div>
        ))}
      </div>

      {/* Top pick */}
      <div className="bg-[#10B981] rounded-xl p-5 shadow-md mb-2">
        <div className="flex flex-row items-center justify-between mb-4">
          <div className="flex flex-row items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 15l-4.224 2.22 1.084-4.782-3.642-3.15 4.86-.425L12 4.5l1.922 4.363 4.86.425-3.642 3.15 1.084 4.782z"/></svg>
            <span className="text-white font-bold text-sm">Favori IA</span>
          </div>
          <div className="px-2.5 py-1 rounded-full" style={{ backgroundColor: cat(top.categorie).bg }}>
            <span className="font-extrabold text-sm" style={{ color: cat(top.categorie).color }}>
              {cat(top.categorie).label}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-2xl">{top.numPmu}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-extrabold text-xl truncate">{top.nom}</h3>
            <p className="text-white/85 text-base mt-0.5 truncate">{top.driver}</p>
          </div>
          {finished ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-white/20 px-3.5 py-2 rounded-md">
                <span className="text-white font-extrabold text-xl">{topPos ? `${topPos}e` : "NP"}</span>
              </div>
              <EcartTag pos={topPos} rank={top.rank} light />
            </div>
          ) : (
            <div className="flex flex-col items-center shrink-0">
              <span className="text-white font-extrabold text-[28px] leading-none">{top.confidence}</span>
              <span className="text-white/80 text-[10px] font-semibold">confiance</span>
            </div>
          )}
        </div>
        
        <p className="text-white text-base mt-4 leading-relaxed">{top.reasoning}</p>
        {top.cote != null && <p className="text-white/90 text-base font-bold mt-1.5">Cote {top.cote.toFixed(1)}</p>}
      </div>

      {/* Rest of the ranks */}
      {rest.map((s) => {
        const pos = posByNum[s.numPmu];
        return (
          <div key={s.numPmu} className="flex flex-row items-center gap-4 bg-white rounded-md p-4 shadow-sm border-l-[3px]" style={{ borderLeftColor: cat(s.categorie).color }}>
            <span className="w-5 text-center text-lg font-extrabold text-[#8E8E93] shrink-0">{s.rank}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat(s.categorie).bg }}>
              <span className="font-extrabold text-sm" style={{ color: cat(s.categorie).color }}>{s.numPmu}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-[#1C1C1E] truncate">{s.nom}</h4>
              <p className="text-sm text-[#8E8E93] mt-0.5 truncate">{s.reasoning}</p>
              <div className="h-1.5 rounded-full bg-[#EBEBEF] mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${s.confidence}%` }} />
              </div>
            </div>
            {finished ? (
              <div className="flex flex-col items-center gap-1 min-w-[44px]">
                <div className="px-2 py-1.5 rounded bg-[#EBEBEF] flex items-center justify-center min-w-[40px]" style={{ backgroundColor: pos === 1 ? "#D4AF37" : pos && pos <= 3 ? "#10B981" : "#EBEBEF" }}>
                  <span className="font-extrabold text-base" style={{ color: pos && pos <= 3 ? "#fff" : "#3A3A3C" }}>{pos ? `${pos}e` : "NP"}</span>
                </div>
                <EcartTag pos={pos} rank={s.rank} />
              </div>
            ) : (
              <div className="flex flex-col items-end min-w-[40px] shrink-0">
                <span className="text-lg font-extrabold text-[#10B981]">{s.score}</span>
                {s.cote != null && <span className="text-sm text-[#8E8E93] mt-0.5">{s.cote.toFixed(1)}</span>}
              </div>
            )}
          </div>
        );
      })}

      {/* Tocards */}
      {tocards && tocards.length > 0 && (
        <div className="bg-[#FFFBEB] rounded-md p-4 mt-2 border border-[#FDE68A]">
          <div className="flex flex-row items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <h3 className="font-extrabold text-lg text-[#92400E]">Tocards à jouer</h3>
          </div>
          <p className="text-sm text-[#B45309] mt-0.5 mb-3">Outsiders hors top 8 · grosses cotes à surveiller</p>
          
          {tocards.map((t: any) => {
            const pos = finished ? posByNum[t.numPmu] : undefined;
            return (
              <div key={t.numPmu} className="flex flex-row items-center gap-4 bg-white rounded p-2 mt-2">
                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: cat(t.categorie).color }}>
                  <span className="text-white font-extrabold text-base">{t.numPmu}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-[#1C1C1E] truncate">{t.nom}</h4>
                  <p className="text-sm text-[#B45309] mt-0.5 truncate">{t.reasoning}</p>
                </div>
                {finished ? (
                  <div className="min-w-[40px] px-2 py-1.5 rounded bg-[#EBEBEF] flex items-center justify-center shrink-0">
                    <span className="font-extrabold text-base text-[#3A3A3C]">{pos ? `${pos}e` : "NP"}</span>
                  </div>
                ) : (
                  <div className="bg-[#FEF3C7] px-2.5 py-1.5 rounded shrink-0">
                    <span className="font-extrabold text-lg text-[#B45309]">{t.cote != null ? t.cote.toFixed(1) : "—"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
