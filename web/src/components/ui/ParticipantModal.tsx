import React, { useEffect, useState } from "react";
import { calculerScore } from "@/lib/score";

interface Gains {
  gainsCarriere?: number;
  gainsVictoires?: number;
  gainsPlace?: number;
  gainsAnneeEnCours?: number;
  gainsAnneePrecedente?: number;
}

interface Participant {
  nom: string;
  numPmu: number;
  age?: number;
  sexe?: string;
  race?: string;
  entraineur?: string;
  driver?: string;
  musique?: string;
  nombreCourses?: number;
  nombreVictoires?: number;
  nombrePlaces?: number;
  gainsCarriere?: number;
  gainsVictoires?: number;
  gainsAnneeEnCours?: number;
  nomPere?: string;
  nomMere?: string;
  urlCasaque?: string;
}

interface ParticipantModalProps {
  participant: Participant | null;
  onClose: () => void;
}

function parseMusique(m: any) {
  // Ex: "8A2A9ADMDM9A"
  if (!m || typeof m !== "string") return [];
  const parts = m.match(/([0-9DTA]+[A-Z])/g) || [];
  return parts.slice(0, 10); // keep last 10
}

function formatEuro(cents?: any) {
  if (cents == null || typeof cents !== "number" || isNaN(cents)) return "0 €";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export function ParticipantModal({ participant, onClose }: ParticipantModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (participant) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [participant]);

  if (!participant) return null;

  const mParts = parseMusique(participant.musique || "");

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className={`relative bg-[#F2F2F7] w-full sm:w-[500px] sm:max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ${isVisible ? "translate-y-0" : "translate-y-full sm:translate-y-[20px]"}`}
      >
        <div className="flex flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center shadow-inner shrink-0">
              <span className="text-white font-black text-xl">{participant.numPmu}</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1C1C1E] leading-tight">{participant.nom}</h2>
              {(participant.age || participant.sexe) && (
                <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wide">
                  {participant.age} ans {participant.sexe ? `· ${participant.sexe}` : ""} {participant.race ? `· ${participant.race}` : ""}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] mb-0.5">Note IA</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-md ${calculerScore(participant) >= 75 ? 'bg-[#10B981]' : calculerScore(participant) >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}>
              {calculerScore(participant)}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Driver / Jockey</span>
              <span className="text-sm font-extrabold text-[#1C1C1E] truncate">{participant.driver || "Non renseigné"}</span>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Entraîneur</span>
              <span className="text-sm font-extrabold text-[#1C1C1E] truncate">{participant.entraineur || "Non renseigné"}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-[#1C1C1E] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-[#E6F4EA] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></span>
              Palmarès & Gains
            </h3>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex flex-col items-center justify-center p-2 bg-[#F9FAFB] rounded-lg">
                <span className="text-lg font-black text-[#1C1C1E]">{participant.nombreCourses || 0}</span>
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase mt-0.5">Courses</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-[#F9FAFB] rounded-lg">
                <span className="text-lg font-black text-[#059669]">{participant.nombreVictoires || 0}</span>
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase mt-0.5">Victoires</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-[#F9FAFB] rounded-lg">
                <span className="text-lg font-black text-[#1C1C1E]">{participant.nombrePlaces || 0}</span>
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase mt-0.5">Places</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[#8E8E93]">Gains Carrière</span>
                <span className="font-extrabold text-[#1C1C1E]">{formatEuro(participant.gainsCarriere)}</span>
              </div>
              <div className="h-px bg-gray-100 w-full" />
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[#8E8E93]">Gains cette année</span>
                <span className="font-extrabold text-[#10B981]">{formatEuro(participant.gainsAnneeEnCours)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-[#1C1C1E] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-[#F3E8FF] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></span>
              Performances Récentes (Musique)
            </h3>
            {mParts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mParts.map((m, i) => (
                  <div key={i} className={`px-2 py-1 rounded text-sm font-bold border ${m.includes('1') ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]' : m.includes('2') || m.includes('3') ? 'bg-[#FEFCE8] border-[#FEF08A] text-[#CA8A04]' : m.includes('D') || m.includes('A') || m.includes('T') ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]'}`}>
                    {m}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#8E8E93]">Inédit ou musique inconnue.</p>
            )}
            {participant.musique && typeof participant.musique === "string" && <p className="text-xs text-[#8E8E93] mt-3 font-semibold">Chaîne brute : {participant.musique}</p>}
          </div>

          {(participant.nomPere || participant.nomMere) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-[#1C1C1E] mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-[#E0E7FF] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>
                Origines
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-[#8E8E93] w-12">Père</span>
                  <span className="font-extrabold text-[#1C1C1E] truncate">{participant.nomPere || "Inconnu"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-[#8E8E93] w-12">Mère</span>
                  <span className="font-extrabold text-[#1C1C1E] truncate">{participant.nomMere || "Inconnue"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
