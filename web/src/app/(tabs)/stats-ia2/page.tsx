"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Loader, EmptyState } from "@/components/ui";
import { Trophy, Star, RefreshCw, Info } from "lucide-react";
import AdBanner from "@/components/AdBanner";

interface NoteStat {
  score: number;
  count: number;
  winRate: number;
  placeRate: number;
  quinteRate: number;
}

export default function StatsIa2() {
  const { token, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NoteStat[]>([]);
  const [races, setRaces] = useState(0);
  const [days, setDays] = useState(0);
  const [computing, setComputing] = useState(false);
  const [processed, setProcessed] = useState(0);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.performanceIa2(token);
      setStats(res.stats || []);
      setRaces(res.races || 0);
      setDays(res.days || 0);
      setComputing(res.computing || false);
      setProcessed(res.processed || 0);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des statistiques IA 2.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // We only load if the user is a premium member, or at least if we have a token.
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
              Stats Notes IA 2
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Les notes les plus chanceuses (Derniers {days} jours)
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

      <div className="flex-1 flex flex-col p-4 pb-24 md:pb-8">
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
          <Loader label="Chargement des statistiques..." />
        ) : stats.length === 0 ? (
          <EmptyState
            icon="BarChart3"
            title="Aucune statistique"
            subtitle="Pas assez de données pour le moment."
            onRetry={loadData}
          />
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto w-full">
            <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-4 mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Info size={16} />
                <p>Basé sur <span className="font-bold text-white">{races}</span> courses Quinté+ analysées.</p>
              </div>
              <p className="text-xs text-gray-500">
                Ce tableau classe les valeurs entières des scores (notes) attribués par l'IA de la plus performante (dans le Quinté) à la moins performante.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {stats.map((s, index) => (
                <div key={s.score} className="bg-[#1C1C1E] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-8 text-center font-bold text-gray-500">
                      #{index + 1}
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-0.5">Note</span>
                      <span className="text-xl font-black text-white">{s.score}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-3 gap-3 w-full mt-2 sm:mt-0">
                    <div className="bg-[#0E0E10] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Quinté</div>
                      <div className="text-lg font-black text-[#10B981]">{s.quinteRate}%</div>
                    </div>
                    <div className="bg-[#0E0E10] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Placé</div>
                      <div className="text-lg font-black text-[#F5C518]">{s.placeRate}%</div>
                    </div>
                    <div className="bg-[#0E0E10] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Gagnant</div>
                      <div className="text-lg font-black text-[#3B82F6]">{s.winRate}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto text-center sm:text-right text-xs text-gray-500 mt-2 sm:mt-0">
                    <span className="font-bold text-gray-300">{s.count}</span> apparitions
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdBanner />
    </div>
  );
}
