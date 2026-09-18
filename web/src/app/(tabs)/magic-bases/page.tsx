"use client";

import { useState, useEffect } from "react";
import { format, subDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Wand, Loader2, Info } from "lucide-react";
import { 
  genererTierce, genererCouplePlace, genererQuinteGarantie100, 
  calculerCout, calculerGarantie 
} from "@/lib/magic-bases/algorithms";
import { Filters, FiltersState, defaultFilters } from "./Filters";
import { bornesOptimise } from "@/lib/magic-bases/optimise";

interface ParticipantPMU {
  numPmu: number;
  nom: string;
  dernierRapportDirect?: { rapport: number };
}

export default function MagicBasesPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [reunion, setReunion] = useState<number>(1);
  const [course, setCourse] = useState<number>(1);
  
  const [base, setBase] = useState<string>("");
  const [partantsInput, setPartantsInput] = useState<string>("");
  
  const [participants, setParticipants] = useState<ParticipantPMU[]>([]);
  const [cotesError, setCotesError] = useState<string>("");
  const [isLoadingCotes, setIsLoadingCotes] = useState(false);
  
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [activeTab, setActiveTab] = useState<"JEU_A" | "JEU_AB" | "JEU_ABC" | "QUINTE">("JEU_A");

  // Résultats
  const [resultTierce, setResultTierce] = useState<number[][]>([]);
  const [resultCouple, setResultCouple] = useState<number[][]>([]);
  const [resultQuinte, setResultQuinte] = useState<number[][]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    fetchCotes();
  }, [date, reunion, course]);

  const fetchCotes = async () => {
    setIsLoadingCotes(true);
    setCotesError("");
    setParticipants([]);

    try {
      const d = format(date, "yyyyMMdd");
      const res = await fetch(`/api/pmu-cotes?date=${d}&r=${reunion}&c=${course}`);
      
      if (!res.ok) {
        throw new Error("Impossible de récupérer les cotes.");
      }
      const data = await res.json();
      
      if (data.participants && Array.isArray(data.participants)) {
        setParticipants(data.participants);
        // Trier par cotes pour OPTImise
        const tries = [...data.participants].sort((a, b) => {
          const coteA = a.dernierRapportDirect?.rapport || 999;
          const coteB = b.dernierRapportDirect?.rapport || 999;
          return coteA - coteB;
        });
        setParticipants(tries);
        if (!partantsInput) {
          setPartantsInput(data.participants.length.toString());
        }
      }
    } catch (e: any) {
      setCotesError(e.message || "Erreur de chargement");
    } finally {
      setIsLoadingCotes(false);
    }
  };

  const evaluerCombinaison = (comb: number[]): boolean => {
    // 1. Filtre Eliminer
    if (filters.eliminer) {
      const numsElimines = filters.eliminer.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
      if (comb.some(n => numsElimines.includes(n))) return false;
    }

    // 2. Filtre Taille (Petits 1-9 / Gros 10-20)
    if (filters.taille !== "toutes") {
      const aPetit = comb.some(n => n <= 9);
      const aGros = comb.some(n => n >= 10);
      if (filters.taille === "mixte" && (!aPetit || !aGros)) return false;
      if (filters.taille === "petits" && aGros) return false;
      if (filters.taille === "gros" && aPetit) return false;
    }

    // 3. Filtre Parité
    if (filters.parite !== "toutes") {
      const aPair = comb.some(n => n % 2 === 0);
      const aImpair = comb.some(n => n % 2 !== 0);
      if (filters.parite === "mixte" && (!aPair || !aImpair)) return false;
      if (filters.parite === "pairs" && aImpair) return false;
      if (filters.parite === "impairs" && aPair) return false;
    }

    // 4. Filtre Consécutifs
    if (filters.consecutifs !== "toutes") {
      const tries = [...comb].sort((a, b) => a - b);
      let aConsecutif = false;
      for (let i = 0; i < tries.length - 1; i++) {
        if (tries[i+1] === tries[i] + 1) aConsecutif = true;
      }
      if (filters.consecutifs === "sans" && aConsecutif) return false;
      if (filters.consecutifs === "avec" && !aConsecutif) return false;
    }

    // 5. Filtre OPTImise (Seulement si indice > 0 et qu'on a les cotes)
    if (filters.optimiseIndice > 0 && participants.length > 0) {
      // Calculer la somme des places de la combinaison selon les cotes
      let sommePlaces = 0;
      for (const n of comb) {
        // Trouver la place de ce numéro dans 'participants' (qui est trié par cote croissante)
        const place = participants.findIndex(p => p.numPmu === n) + 1;
        sommePlaces += (place > 0 ? place : participants.length);
      }

      // Vérifier les bornes
      const typePariCible = comb.length === 5 ? "quinte" : filters.optimisePari;
      
      const chancesOptions = typePariCible === "quinte" 
        ? [42,47,50,55,60,62,66,70,73,77,78,80,82,84,87,89,91,92]
        : [47,53,58,63,68,71,75,78,82,84,85,87,89,89,92,93,95,95];
      
      const ligneIndex = chancesOptions.indexOf(filters.optimiseChances);
      if (ligneIndex >= 0) {
        const bornes = bornesOptimise(typePariCible, filters.optimiseIndice, ligneIndex);
        if (bornes) {
          const [min, max] = bornes;
          if (sommePlaces < min || sommePlaces > max) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleGenerate = () => {
    const numPartants = parseInt(partantsInput);
    const numBase = parseInt(base);

    if (isNaN(numPartants) || isNaN(numBase) || numPartants < 10 || numPartants > 20) {
      alert("Veuillez entrer un nombre de partants valide (10-20) et une base.");
      return;
    }

    if (numBase < 1 || numBase > numPartants) {
      alert("La base doit être comprise entre 1 et le nombre de partants.");
      return;
    }

    let t = genererTierce(numPartants, numBase);
    let cp = genererCouplePlace(numPartants, numBase);
    let q = genererQuinteGarantie100(numPartants, numBase);

    // Appliquer les filtres
    t = t.filter(evaluerCombinaison);
    cp = cp.filter(evaluerCombinaison);
    q = q.filter(evaluerCombinaison);

    setResultTierce(t);
    setResultCouple(cp);
    setResultQuinte(q);
    setHasGenerated(true);
  };

  const formatComb = (c: number[]) => c.join("-");

  const coutA_T = calculerCout("JEU_A", resultTierce.length, "tierce");
  const coutA_C = calculerCout("JEU_A", resultCouple.length, "couple");
  const coutAB_T = calculerCout("JEU_AB", resultTierce.length, "tierce");
  const coutAB_C = calculerCout("JEU_AB", resultCouple.length, "couple");
  const coutABC_T = calculerCout("JEU_ABC", resultTierce.length, "tierce");
  const coutABC_C = calculerCout("JEU_ABC", resultCouple.length, "couple");

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white pb-24">
      {/* Header */}
      <div className="bg-[#1C1C1E] border-b border-white/5 pt-12 pb-6 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]"></div>
        <div className="flex items-center gap-3">
          <div className="bg-[#D4AF37]/20 p-2 rounded-lg">
            <Wand className="text-[#D4AF37]" size={24} />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter">
            MAGIC <span className="text-[#D4AF37]">BASES</span>
          </h1>
        </div>
        <p className="text-sm text-gray-400 mt-2">Générez vos combinaisons optimales avec l'algorithme Tiercéwague.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Sélecteur de Course PMU */}
        <div className="bg-[#1C1C1E] rounded-xl p-5 mb-6 border border-white/5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date</label>
            <div className="flex items-center bg-[#2A2A2D] rounded-lg p-1">
              <button onClick={() => setDate(subDays(date, 1))} className="px-3 py-1 text-gray-400 hover:text-white">-</button>
              <div className="px-4 py-1 font-bold">{format(date, "dd/MM/yyyy")}</div>
              <button onClick={() => setDate(addDays(date, 1))} className="px-3 py-1 text-gray-400 hover:text-white">+</button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Réunion</label>
            <select value={reunion} onChange={e => setReunion(parseInt(e.target.value))} className="bg-[#2A2A2D] text-white rounded-lg p-2 border border-white/10 outline-none w-20">
              {[1,2,3,4,5,6].map(i => <option key={i} value={i}>R{i}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Course</label>
            <select value={course} onChange={e => setCourse(parseInt(e.target.value))} className="bg-[#2A2A2D] text-white rounded-lg p-2 border border-white/10 outline-none w-20">
              {[1,2,3,4,5,6,7,8,9,10].map(i => <option key={i} value={i}>C{i}</option>)}
            </select>
          </div>

          <div className="flex-1 flex items-center justify-end">
            {isLoadingCotes ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Chargement cotes...</span>
              </div>
            ) : cotesError ? (
              <div className="text-red-400 text-sm flex items-center gap-1">
                <Info size={14}/> {cotesError}
              </div>
            ) : (
              <div className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Cotes OK
              </div>
            )}
          </div>
        </div>

        {/* Inputs Base et Partants */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1C1C1E] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Nombre de Partants</label>
            <input 
              type="number" 
              value={partantsInput} 
              onChange={e => setPartantsInput(e.target.value)}
              className="w-full bg-[#2A2A2D] text-white text-xl font-black rounded-lg p-3 border-2 border-transparent focus:border-[#D4AF37]/50 outline-none transition-colors"
              placeholder="Ex: 16"
            />
          </div>
          
          <div className="bg-[#1C1C1E] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <label className="block text-sm font-bold text-[#D4AF37] mb-2 flex justify-between">
              Cheval de Base
            </label>
            <input 
              type="number" 
              value={base} 
              onChange={e => setBase(e.target.value)}
              className="w-full bg-[#2A2A2D] text-[#D4AF37] text-xl font-black rounded-lg p-3 border-2 border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none transition-colors placeholder:text-[#D4AF37]/30"
              placeholder="N°"
            />
          </div>
        </div>

        {/* Filtres */}
        <Filters filters={filters} setFilters={setFilters} isGarantieMode={activeTab === "QUINTE"} />

        {/* Generate Button */}
        <button 
          onClick={handleGenerate}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black font-black text-lg py-4 rounded-xl shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98] transition-all mb-10"
        >
          GÉNÉRER LES COMBINAISONS
        </button>

        {/* Résultats */}
        {hasGenerated && (
          <div className="space-y-6">
            <div className="flex bg-[#1C1C1E] p-1 rounded-lg border border-white/5">
              {(["JEU_A", "JEU_AB", "JEU_ABC", "QUINTE"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                    activeTab === tab 
                      ? "bg-[#2A2A2D] text-white shadow-sm" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "QUINTE" ? "Garantie 100%" : tab.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* JEU A, AB, ABC */}
            {activeTab !== "QUINTE" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Carte Tiercé */}
                <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                  <div className="bg-[#2A2A2D] p-4 flex justify-between items-center">
                    <h3 className="font-black text-lg">TIERCÉ</h3>
                    <div className="text-right">
                      <div className="text-[#D4AF37] font-black text-xl">
                        {activeTab === "JEU_A" ? coutA_T : activeTab === "JEU_AB" ? coutAB_T : coutABC_T} €
                      </div>
                      <div className="text-xs text-gray-400">
                        {activeTab === "JEU_A" ? calculerGarantie("JEU_A", "tierce") : activeTab === "JEU_AB" ? calculerGarantie("JEU_AB", "tierce") : calculerGarantie("JEU_ABC", "tierce")}% garanti
                      </div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {resultTierce.map((c, i) => (
                      <div key={i} className="bg-white/5 text-center py-2 rounded font-mono text-sm">
                        {formatComb(c)}
                      </div>
                    ))}
                    {resultTierce.length === 0 && <div className="col-span-full text-center text-gray-500 py-4">Aucune combinaison avec ces filtres</div>}
                  </div>
                </div>

                {/* Carte Couplé */}
                <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                  <div className="bg-[#2A2A2D] p-4 flex justify-between items-center">
                    <h3 className="font-black text-lg">COUPLÉ PLACÉ</h3>
                    <div className="text-right">
                      <div className="text-[#D4AF37] font-black text-xl">
                        {activeTab === "JEU_A" ? coutA_C : activeTab === "JEU_AB" ? coutAB_C : coutABC_C} €
                      </div>
                      <div className="text-xs text-gray-400">
                        {activeTab === "JEU_A" ? calculerGarantie("JEU_A", "couple") : activeTab === "JEU_AB" ? calculerGarantie("JEU_AB", "couple") : calculerGarantie("JEU_ABC", "couple")}% garanti
                      </div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {resultCouple.map((c, i) => (
                      <div key={i} className="bg-white/5 text-center py-2 rounded font-mono text-sm">
                        {formatComb(c)}
                      </div>
                    ))}
                    {resultCouple.length === 0 && <div className="col-span-full text-center text-gray-500 py-4">Aucune combinaison avec ces filtres</div>}
                  </div>
                </div>
              </div>
            )}

            {/* QUINTE GARANTIE 100% */}
            {activeTab === "QUINTE" && (
              <div className="bg-[#1C1C1E] rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-900/40 to-[#1C1C1E] p-4 flex justify-between items-center border-b border-emerald-500/20">
                  <div>
                    <h3 className="font-black text-lg text-emerald-400">QUINTÉ - GARANTIE 100% TIERCE</h3>
                    <p className="text-xs text-gray-400">Joue un Quinté, garantit le Tiercé à 100% (sans ordre)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-black text-2xl">
                      {resultQuinte.length * 2} €
                    </div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resultQuinte.map((c, i) => (
                    <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 text-center py-3 rounded-lg font-mono text-sm">
                      {formatComb(c)}
                    </div>
                  ))}
                  {resultQuinte.length === 0 && <div className="col-span-full text-center text-gray-500 py-4">Aucune combinaison avec ces filtres</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
