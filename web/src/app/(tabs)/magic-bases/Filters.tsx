"use client";

import { useState } from "react";
import { getLignesChances, PariOptimise } from "@/lib/magic-bases/optimise";

export interface FiltersState {
  taille: "toutes" | "mixte" | "petits" | "gros";
  parite: "toutes" | "mixte" | "pairs" | "impairs";
  consecutifs: "toutes" | "sans" | "avec";
  eliminer: string;
  optimisePari: PariOptimise;
  optimiseIndice: number; // 0 = désactivé, 1-10
  optimiseChances: number;
}

export const defaultFilters: FiltersState = {
  taille: "toutes",
  parite: "toutes",
  consecutifs: "toutes",
  eliminer: "",
  optimisePari: "tierce",
  optimiseIndice: 0,
  optimiseChances: 47,
};

interface FiltersProps {
  filters: FiltersState;
  setFilters: (f: FiltersState) => void;
  isGarantieMode?: boolean; // If true, hide couple options for OPTImise
}

export function Filters({ filters, setFilters, isGarantieMode }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const update = (key: keyof FiltersState, val: any) => {
    setFilters({ ...filters, [key]: val });
  };

  const chancesDispo = getLignesChances(filters.optimisePari);
  if (!chancesDispo.includes(filters.optimiseChances)) {
    // Si on a switché de pari et que le % n'existe pas, on prend le premier
    setFilters({ ...filters, optimiseChances: chancesDispo[0] });
  }

  return (
    <div className="bg-[#1C1C1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-white/5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#2A2A2D]"
      >
        <span className="font-extrabold text-white text-lg">Filtres & OPTImise</span>
        <svg 
          width="20" height="20" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtres de base */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-400">Petits / Gros</label>
              <select 
                value={filters.taille} 
                onChange={e => update("taille", e.target.value)}
                className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
              >
                <option value="toutes">Toutes</option>
                <option value="mixte">Mixte (au moins 1 de chaque)</option>
                <option value="petits">Petits seulement (1-9)</option>
                <option value="gros">Gros seulement (10-20)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-400">Parité</label>
              <select 
                value={filters.parite} 
                onChange={e => update("parite", e.target.value)}
                className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
              >
                <option value="toutes">Toutes</option>
                <option value="mixte">Mixte</option>
                <option value="pairs">Pairs seulement</option>
                <option value="impairs">Impairs seulement</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-400">Nombres Consécutifs</label>
              <select 
                value={filters.consecutifs} 
                onChange={e => update("consecutifs", e.target.value)}
                className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
              >
                <option value="toutes">Toutes</option>
                <option value="sans">Sans consécutifs</option>
                <option value="avec">Avec consécutifs</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-400">Numéros à éliminer</label>
              <input 
                type="text" 
                value={filters.eliminer} 
                onChange={e => update("eliminer", e.target.value)}
                placeholder="Ex: 3 7 12"
                className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none placeholder:text-gray-600"
              />
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Filtre OPTImise */}
          <div className="flex flex-col gap-3">
            <h3 className="font-extrabold text-[#10B981] text-base">Filtre OPTImise</h3>
            <p className="text-xs text-gray-400 mb-2">
              Élimine les combinaisons dont la somme des places (selon les cotes) sort d'une fourchette logique.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Indice de régularité</label>
                <select 
                  value={filters.optimiseIndice} 
                  onChange={e => update("optimiseIndice", parseInt(e.target.value))}
                  className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
                >
                  <option value={0}>Désactivé</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                    <option key={i} value={i}>Indice {i}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Type de pari cible</label>
                <select 
                  value={filters.optimisePari} 
                  onChange={e => update("optimisePari", e.target.value)}
                  className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
                >
                  <option value="tierce">Tiercé</option>
                  <option value="quinte">Quinté</option>
                  {!isGarantieMode && <option value="couple-place">Couplé Placé</option>}
                  {!isGarantieMode && <option value="couple-gagnant">Couplé Gagnant</option>}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">% de chances conservées</label>
                <select 
                  value={filters.optimiseChances} 
                  onChange={e => update("optimiseChances", parseInt(e.target.value))}
                  className="bg-[#2A2A2D] text-white rounded-lg p-2.5 border border-white/10 outline-none"
                >
                  {chancesDispo.map((c, idx) => (
                    <option key={idx} value={c}>{c} %</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
