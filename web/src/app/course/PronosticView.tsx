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
      <div className="bg-[#10B981] rounded-xl p-5 shadow-[0_4px_16px_rgba(16,185,129,0.3)] mb-2 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-row items-center justify-between mb-4 relative z-10">
          <div className="flex flex-row items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 15l-4.224 2.22 1.084-4.782-3.642-3.15 4.86-.425L12 4.5l1.922 4.363 4.86.425-3.642 3.15 1.084 4.782z"/></svg>
            <span className="text-white font-extrabold text-sm tracking-wide">FAVORI IA</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            {top.cote != null && (
              <div className="px-3 py-1.5 rounded-full bg-white/20 text-white font-extrabold text-sm">
                Cote {top.cote.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-xl bg-white/20 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <span className="text-white font-black text-3xl leading-none">{top.numPmu}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-2xl truncate tracking-tight">{top.nom}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-white/90 text-sm font-semibold bg-black/10 px-2 py-0.5 rounded flex items-center gap-1 truncate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                {top.driver || "Inconnu"}
              </span>
              {top.age && top.sexe && (
                <span className="text-white/80 text-xs font-bold uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded">
                  {top.age} ans · {top.sexe}
                </span>
              )}
            </div>
          </div>
          {finished ? (
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="bg-white/20 px-3.5 py-2 rounded-md">
                <span className="text-white font-extrabold text-xl">{topPos ? `${topPos}e` : "NP"}</span>
              </div>
              <EcartTag pos={topPos} rank={top.rank} light />
            </div>
          ) : (
            <div className="flex flex-col items-center shrink-0 bg-black/10 px-3 py-2 rounded-xl">
              <span className="text-white font-black text-[28px] leading-none">{top.confidence}</span>
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider mt-1">score</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
          <p className="text-white text-[15px] leading-relaxed font-medium">{top.reasoning}</p>
        </div>
      </div>

      {/* Rest of the ranks */}
      {rest.map((s) => {
        const pos = posByNum[s.numPmu];
        return (
          <div key={s.numPmu} className="flex flex-row items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cat(s.categorie).color }} />
            <span className="w-5 text-center text-lg font-black text-gray-300 shrink-0 ml-1">{s.rank}</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: cat(s.categorie).bg }}>
              <span className="font-extrabold text-lg" style={{ color: cat(s.categorie).color }}>{s.numPmu}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-[16px] font-extrabold text-[#1C1C1E] truncate">{s.nom}</h4>
                {s.cote != null && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                    {s.cote.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#8E8E93] mt-1 line-clamp-2 leading-snug">{s.reasoning}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#EBEBEF] overflow-hidden">
                  <div className="h-full rounded-full bg-[#10B981] transition-all" style={{ width: `${s.confidence}%` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 w-6 text-right">{s.score}</span>
              </div>
            </div>
            {finished ? (
              <div className="flex flex-col items-center gap-1.5 min-w-[44px]">
                <div className="px-2 py-1.5 rounded-lg flex items-center justify-center min-w-[44px] shadow-inner" style={{ backgroundColor: pos === 1 ? "#D4AF37" : pos && pos <= 3 ? "#10B981" : "#F2F2F7" }}>
                  <span className="font-extrabold text-[15px]" style={{ color: pos && pos <= 3 ? "#fff" : "#8E8E93" }}>{pos ? `${pos}e` : "NP"}</span>
                </div>
                <EcartTag pos={pos} rank={s.rank} />
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Tocards */}
      {tocards && tocards.length > 0 && (
        <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-xl p-5 mt-4 border border-[#FDE68A] shadow-sm">
          <div className="flex flex-row items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-[#F59E0B] p-1.5 rounded-md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </div>
              <h3 className="font-black text-xl text-[#92400E]">Coups de poker</h3>
            </div>
          </div>
          <p className="text-[13px] font-semibold text-[#B45309] mb-4">Outsiders hors top 8 · Grosses cotes détectées par l'IA</p>
          
          <div className="grid grid-cols-1 gap-3">
            {tocards.map((t: any) => {
              const pos = finished ? posByNum[t.numPmu] : undefined;
              return (
                <div key={t.numPmu} className="flex flex-row items-center gap-4 bg-white/80 backdrop-blur rounded-xl p-3 border border-white/50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:bg-white transition-colors">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center shadow-inner" style={{ backgroundColor: cat(t.categorie).color }}>
                    <span className="text-white font-extrabold text-lg">{t.numPmu}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15px] font-extrabold text-[#1C1C1E] truncate">{t.nom}</h4>
                    </div>
                    <p className="text-[13px] text-[#B45309] mt-0.5 line-clamp-1">{t.reasoning}</p>
                  </div>
                  {finished ? (
                    <div className="min-w-[44px] px-2 py-1.5 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="font-extrabold text-[15px] text-gray-500">{pos ? `${pos}e` : "NP"}</span>
                    </div>
                  ) : (
                    <div className="bg-white px-3 py-1.5 rounded-lg shrink-0 border border-amber-100 shadow-sm">
                      <span className="font-black text-lg text-[#D97706]">{t.cote != null ? t.cote.toFixed(1) : "—"}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
