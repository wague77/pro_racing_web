"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Loader, EmptyState } from "@/components/ui";
import { Trophy, Star, RefreshCw, Info, Calendar, ChevronDown } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import { format } from "date-fns";

interface NoteStat {
  score: number;
  count: number;
  winRate: number;
  placeRate: number;
  quinteRate: number;
}

interface Horse {
  numPmu: number;
  nom: string;
  score: number;
}

export default function StatsIa2() {
  const { token, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Historical stats state
  const [stats, setStats] = useState<NoteStat[]>([]);
  const [races, setRaces] = useState(0);
  const [days, setDays] = useState(30); // Default to 30 days
  const [computing, setComputing] = useState(false);
  const [processed, setProcessed] = useState(0);

  // Today's Quinté state
  const [quinteRaceInfo, setQuinteRaceInfo] = useState<{ r: number, c: number, libelle: string } | null>(null);
  const [quintePronostic, setQuintePronostic] = useState<Horse[] | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch historical stats for the selected period
      const res = await api.performanceIa2(token, days);
      setStats(res.stats || []);
      setRaces(res.races || 0);
      setComputing(res.computing || false);
      setProcessed(res.processed || 0);

      // Fetch today's Quinté
      const today = new Date();
      const dateStr = format(today, "ddMMyyyy");
      const progRes = await api.programme(dateStr, token);
      
      let qRace: { r: number, c: number, libelle: string } | null = null;
      if (progRes && progRes.reunions) {
        for (const reunion of progRes.reunions) {
          for (const course of reunion.courses || []) {
            if (course.quinte) {
              qRace = {
                r: reunion.numOfficiel,
                c: course.numOrdre,
                libelle: `R${reunion.numOfficiel}C${course.numOrdre} - ${course.libelleCourt || course.libelle}`
              };
              break;
            }
          }
          if (qRace) break;
        }
      }

      setQuinteRaceInfo(qRace);

      if (qRace) {
        const pronoRes = await api.pronostic(dateStr, qRace.r, qRace.c, token);
        if (pronoRes && pronoRes.selection) {
          setQuintePronostic(pronoRes.selection);
        } else {
          setQuintePronostic(null);
        }
      } else {
        setQuintePronostic(null);
      }

    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    if (token) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [token, loadData]);

  // Handle computing state auto-refresh
  useEffect(() => {
    if (computing) {
      const t = setInterval(loadData, 5000);
      return () => clearInterval(t);
    }
  }, [computing, loadData]);

  const statsMap = useMemo(() => {
    const map = new Map<number, NoteStat>();
    stats.forEach(s => map.set(s.score, s));
    return map;
  }, [stats]);

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Non connecté</h2>
        <p className="text-gray-400">Veuillez vous connecter pour voir les statistiques.</p>
      </div>
    );
  }

  if (isDemo) {
    return (
      <div className="flex-1 flex flex-col p-4 pb-24 md:pb-8">
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-2xl border border-white/10 mt-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FDE68A] to-[#F5C518] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,197,24,0.3)]">
            <Star size={32} color="#7A5200" fill="#7A5200" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Accès Premium Requis</h2>
          <p className="text-gray-400 mb-6 max-w-sm">
            Les statistiques détaillées de l'IA 2 sont réservées aux membres premium.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0E10]">
      <div className="glass-panel border-b border-white/5 pt-safe-top sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Trophy className="text-[#F5C518]" size={24} />
              Stats IA 2 & Quinté
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Probabilités selon l'historique
            </p>
          </div>
          <button 
            onClick={loadData}
            disabled={loading || computing}
            className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${
              (loading || computing) ? "opacity-50" : "hover:bg-white/10 active:scale-95"
            }`}
          >
            <RefreshCw size={18} className={(loading || computing) ? "animate-spin text-gray-400" : "text-white"} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 pb-24 md:pb-8 max-w-4xl mx-auto w-full">
        
        {/* Filtre de Période */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#1C1C1E] rounded-xl border border-white/5 p-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Période d'analyse</h2>
              <p className="text-xs text-gray-400">Historique des arrivées Quinté+</p>
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={loading}
              className="w-full sm:w-48 appearance-none bg-[#0E0E10] border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            >
              <option value={30}>1 Mois (30 jours)</option>
              <option value={90}>3 Mois (90 jours)</option>
              <option value={180}>6 Mois (180 jours)</option>
              <option value={365}>1 An (365 jours)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {computing && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <RefreshCw className="animate-spin text-blue-400 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="text-sm font-bold text-blue-400">Calcul en arrière-plan</h3>
              <p className="text-xs text-blue-400/70 mt-1">
                L'IA analyse l'historique ({processed} courses traitées...). Les résultats se mettront à jour automatiquement.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && stats.length === 0 ? (
          <Loader label="Chargement des données..." />
        ) : (
          <div className="space-y-6">
            
            {/* Section Quinté du Jour */}
            <div>
              <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                Pronostic Quinté du Jour
                {quinteRaceInfo && <span className="text-xs font-bold bg-[#F5C518]/20 text-[#F5C518] px-2 py-1 rounded-md">{quinteRaceInfo.libelle}</span>}
              </h2>

              {!quinteRaceInfo ? (
                <EmptyState
                  icon="Calendar"
                  title="Pas de Quinté aujourd'hui"
                  subtitle="Aucune course Quinté n'a été trouvée dans le programme du jour."
                />
              ) : !quintePronostic ? (
                <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-6 text-center text-gray-400 text-sm">
                  Le pronostic IA pour le Quinté du jour n'est pas encore disponible.
                </div>
              ) : (
                <div className="bg-[#1C1C1E] rounded-xl border border-[#F5C518]/20 overflow-hidden relative shadow-[0_0_15px_rgba(245,197,24,0.05)]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-50"></div>
                  
                  <div className="grid grid-cols-1 divide-y divide-white/5">
                    {quintePronostic.map((horse, idx) => {
                      const roundedScore = Math.round(horse.score);
                      const horseStats = statsMap.get(roundedScore);
                      
                      return (
                        <div key={horse.numPmu} className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-4 w-full sm:w-1/3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-gray-400 border border-white/10 flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5C518]/20 to-[#F5C518]/5 border border-[#F5C518]/30 flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden">
                              <span className="text-base font-black text-[#F5C518] relative z-10">{horse.numPmu}</span>
                            </div>
                            <div className="flex-1 truncate">
                              <h3 className="font-bold text-white text-sm truncate">{horse.nom}</h3>
                              <p className="text-xs text-gray-400">Note: {horse.score.toFixed(1)}</p>
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-3 gap-2 w-full mt-2 sm:mt-0">
                            <div className="bg-[#0E0E10] rounded-lg p-2 text-center border border-white/5 relative overflow-hidden">
                              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Quinté</div>
                              <div className="text-sm font-black text-[#10B981]">
                                {horseStats ? `${horseStats.quinteRate}%` : "N/A"}
                              </div>
                            </div>
                            <div className="bg-[#0E0E10] rounded-lg p-2 text-center border border-white/5">
                              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Placé</div>
                              <div className="text-sm font-black text-[#F5C518]">
                                {horseStats ? `${horseStats.placeRate}%` : "N/A"}
                              </div>
                            </div>
                            <div className="bg-[#0E0E10] rounded-lg p-2 text-center border border-white/5">
                              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Gagnant</div>
                              <div className="text-sm font-black text-[#3B82F6]">
                                {horseStats ? `${horseStats.winRate}%` : "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-3 bg-[#0E0E10]/50 border-t border-white/5 text-center">
                    <p className="text-[11px] text-gray-500">
                      Les pourcentages indiquent la probabilité statistique de réussite basée sur {races} courses Quinté+ analysées les {days} derniers jours pour chaque note entière.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Section Classement Global (Optionnelle / informative) */}
            <div className="pt-6 border-t border-white/10">
              <h2 className="text-xl font-black text-white mb-4">Classement Global des Notes</h2>
              <p className="text-sm text-gray-400 mb-4">
                Découvrez quelles notes ont été historiquement les plus chanceuses dans le Quinté+ sur les {days} derniers jours.
              </p>
              
              {stats.length === 0 ? (
                <EmptyState
                  icon="BarChart3"
                  title="Aucune statistique"
                  subtitle="Pas assez de données pour la période sélectionnée."
                  onRetry={loadData}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.slice(0, 10).map((s, index) => (
                    <div key={s.score} className="bg-[#1C1C1E] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-6 text-center font-bold text-gray-500 text-xs">#{index + 1}</div>
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-white">{s.score}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-center px-2">
                        <div className="text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Q+</div>
                          <div className="text-sm font-black text-[#10B981]">{s.quinteRate}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Placé</div>
                          <div className="text-sm font-black text-[#F5C518]">{s.placeRate}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Gagnant</div>
                          <div className="text-sm font-black text-[#3B82F6]">{s.winRate}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <AdBanner />
    </div>
  );
}
