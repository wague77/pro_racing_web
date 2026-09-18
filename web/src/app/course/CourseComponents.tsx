"use client";

import React from "react";
import Image from "next/image";
import { OddsBadge } from "@/components/ui";

export function ArriveeCard({ arrivee }: { arrivee: any[] }) {
  const medal = (o: number) =>
    o === 1 ? "#D4AF37" : o === 2 ? "#A8A8AD" : o === 3 ? "#CD7F32" : "#EBEBEF";

  return (
    <div className="bg-[#1C1C1E] rounded-md p-4 mb-4 shadow-sm">
      <div className="flex flex-row items-center gap-2 mb-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
        <h3 className="text-white font-extrabold text-base">Arrivée officielle</h3>
      </div>
      {arrivee.map((a) => (
        <div key={a.numPmu} className="flex flex-row items-center gap-2 py-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: medal(a.ordre) }}>
            <span className="font-extrabold text-sm" style={{ color: a.ordre <= 3 ? "#fff" : "#1C1C1E" }}>{a.ordre}</span>
          </div>
          <div className="w-6 h-6 rounded-[7px] bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm">{a.numPmu}</span>
          </div>
          <span className="flex-1 text-white font-semibold text-base truncate">{a.nom}</span>
          {a.cote != null && <span className="text-white/70 font-bold text-sm">{a.cote.toFixed(1)}</span>}
        </div>
      ))}
    </div>
  );
}

export function ParticipantRow({
  part,
  isFav,
  onFav,
  onPress,
}: {
  part: any;
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  onPress: () => void;
}) {
  const scratched = part.statut && part.statut !== "PARTANT";
  return (
    <div
      onClick={onPress}
      className={`flex flex-row items-center gap-4 bg-white rounded-md p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors ${scratched ? "opacity-50" : ""}`}
    >
      <div className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center shrink-0">
        <span className="text-white font-extrabold text-lg">{part.numPmu}</span>
      </div>
      
      {part.ordreArrivee && (
        <div 
          className="px-2 py-1 rounded shrink-0" 
          style={{ backgroundColor: part.ordreArrivee === 1 ? "#D4AF37" : part.ordreArrivee === 2 ? "#A8A8AD" : part.ordreArrivee === 3 ? "#CD7F32" : "#EBEBEF" }}
        >
          <span className="text-sm font-extrabold text-white">{part.ordreArrivee}e</span>
        </div>
      )}

      {part.urlCasaque && (
        <div className="relative w-8 h-8 shrink-0">
          <Image src={part.urlCasaque} alt="Casaque" fill className="object-contain" unoptimized />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-lg font-bold text-[#1C1C1E] truncate">
          {part.nom}
        </span>
        <div className="flex flex-row gap-1 text-sm text-[#8E8E93] mt-0.5 truncate">
          {part.driver ? (
            <span className="truncate">{part.driver}</span>
          ) : part.entraineur ? (
            <span className="truncate">{part.entraineur}</span>
          ) : null}
        </div>
        {part.musique && <span className="text-sm text-[#10B981] font-semibold tracking-wide mt-1 truncate">{part.musique}</span>}
      </div>

      <div className="flex flex-col items-center shrink-0">
        <OddsBadge cote={part.cote} tendance={part.tendance} />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFav(e);
          }}
          className="mt-1.5 p-1"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isFav ? "#FF3B30" : "none"}
            stroke={isFav ? "#FF3B30" : "#8E8E93"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

const PARI_LABELS: Record<string, string> = {
  SIMPLE_GAGNANT: "Simple Gagnant",
  SIMPLE_PLACE: "Simple Placé",
  COUPLE_GAGNANT: "Couplé Gagnant",
  COUPLE_PLACE: "Couplé Placé",
  COUPLE_ORDRE: "Couplé Ordre",
  TRIO: "Trio",
  TIERCE: "Tiercé",
  QUARTE_PLUS: "Quarté+",
  QUINTE_PLUS: "Quinté+",
  DEUX_SUR_QUATRE: "2 sur 4",
  MULTI: "Multi",
};

export function RapportsCard({ rapports }: { rapports: any[] }) {
  return (
    <div className="bg-white rounded-md p-4 mb-4 shadow-sm">
      <div className="flex flex-row items-center gap-2 mb-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
        <h3 className="text-[#1C1C1E] font-extrabold text-base">Rapports définitifs (pour 1€)</h3>
      </div>
      {rapports.map((p) => (
        <div key={p.typePari} className="py-2 border-t border-[#E5E5EA]">
          <h4 className="text-sm font-bold text-[#8E8E93] mb-1.5">{PARI_LABELS[p.typePari] || p.typePari}</h4>
          <div className="flex flex-row flex-wrap gap-1.5">
            {p.rapports.map((rp: any, i: number) => (
              <div key={i} className="flex flex-row items-center gap-1.5 bg-[#E6F4EA] px-2.5 py-1 rounded-sm">
                <span className="text-sm font-bold text-[#0A7A42]">{rp.combinaison}</span>
                <span className="text-base font-extrabold text-[#10B981]">{rp.dividende.toFixed(2)}€</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LockedFeature({
  title,
  subtitle,
  onUnlock,
  onWatchAd,
  watching,
  remaining,
}: {
  title: string;
  subtitle: string;
  onUnlock: () => void;
  onWatchAd?: () => void;
  watching?: boolean;
  remaining?: number;
}) {
  const limitReached = typeof remaining === "number" && remaining <= 0;
  return (
    <div className="p-5 pb-10 flex flex-col">
      <div className="flex flex-col gap-2 -mb-[140px] pointer-events-none">
        {[0.9, 0.6, 0.4].map((o, i) => (
          <div key={i} className="flex flex-row items-center gap-4 bg-white rounded-md p-4" style={{ opacity: o }}>
            <div className="w-9 h-9 rounded-lg bg-[#EBEBEF]" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2.5 rounded-full bg-[#EBEBEF] w-[70%]" />
              <div className="h-2.5 rounded-full bg-[#EBEBEF] w-[45%]" />
            </div>
            <div className="w-11 h-6 rounded-full bg-[#EBEBEF]" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-2 mt-20 shadow-lg relative z-10">
        <div className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center mb-1">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h3 className="text-xl font-extrabold text-[#1C1C1E] text-center">{title}</h3>
        <p className="text-base text-[#8E8E93] text-center mb-2">{subtitle}</p>
        
        {onWatchAd && (
          <>
            <button
              onClick={onWatchAd}
              disabled={watching || limitReached}
              className={`flex flex-row gap-2 items-center justify-center bg-[#FDE68A] border border-[#F5C518] rounded-md py-3 px-5 mb-2 w-full transition-opacity ${(watching || limitReached) ? "opacity-50" : "hover:bg-[#FCD34D]"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5200" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              <span className="text-[#7A5200] font-extrabold text-sm text-center">
                {watching ? "Chargement de la vidéo…" : limitReached ? "Limite du jour atteinte · revenez demain" : "Regarder une vidéo pour débloquer ce pronostic"}
              </span>
            </button>
            {typeof remaining === "number" && !limitReached && (
              <span className="text-[#8E8E93] text-sm text-center mb-2">{remaining} vidéo(s) gratuite(s) restante(s) aujourd'hui</span>
            )}
          </>
        )}
        
        <button
          onClick={onUnlock}
          className="flex flex-row gap-2 items-center justify-center bg-[#10B981] rounded-md py-3 px-6 w-full transition-colors hover:bg-[#059669]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          <span className="text-white font-extrabold text-base">Débloquer l'accès complet</span>
        </button>
      </div>
    </div>
  );
}
