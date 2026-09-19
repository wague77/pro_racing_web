"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { isQuintePlus, apiDate, fmtHeure } from "@/lib/format";
import { Loader, EmptyState } from "@/components/ui";
import { Trophy, Star, RefreshCw, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Target, Sparkles, CheckCircle, Flame, ShieldAlert, Award } from "lucide-react";
import AdBanner from "@/components/AdBanner";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

interface NoteStat {
  score: number;
  count: number;
  winRate: number;
  placeRate: number;
  quinteRate: number;
  won?: number;
  placed?: number;
  quinte?: number;
}

interface TargetNotes {
  topQuinte: NoteStat[];
  topWon: NoteStat[];
  topPlaced: NoteStat[];
  recommendedScores: number[];
}

interface Horse {
  numPmu: number;
  nom: string;
  score: number;
  cote?: number;
}

export default function StatsIa2() {
  const { token, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Historical stats state
  const [stats, setStats] = useState<NoteStat[]>([]);
  const [targetNotes, setTargetNotes] = useState<TargetNotes | null>(null);
  const [races, setRaces] = useState(0);
  const [days, setDays] = useState(30); // 30, 90, 180, 365
  const [computing, setComputing] = useState(false);
  const [processed, setProcessed] = useState(0);

  // Quinté race state with Date selection
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [quinteRaceInfo, setQuinteRaceInfo] = useState<{ r: number, c: number, libelle: string, heureDepart?: number } | null>(null);
  const [quintePronostic, setQuintePronostic] = useState<Horse[] | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch historical stats & target notes for the selected period
      const res = await api.performanceIa2(token, days);
      setStats(res.stats || []);
      setTargetNotes(res.targetNotes || null);
      setRaces(res.races || 0);
      setComputing(res.computing || false);
      setProcessed(res.processed || 0);

      // 2. Fetch Quinté race for the selected date
      const dateStr = apiDate(selectedDate);
      const progRes = await api.programme(dateStr, token);
      
      let qRace: { r: number, c: number, libelle: string, heureDepart?: number } | null = null;
      if (progRes && Array.isArray(progRes.reunions)) {
        for (const reunion of progRes.reunions) {
          const rnum = reunion.numOfficiel || reunion.numExterne;
          for (const course of reunion.courses || []) {
            const cnum = course.numOrdre || course.numExterne;
            const isQ = course.quinte === true || 
                        isQuintePlus(course) || 
                        (course.libelle && course.libelle.toUpperCase().includes("QUINTE")) ||
                        (course.libelleCourt && course.libelleCourt.toUpperCase().includes("QUINTE"));
            if (isQ) {
              qRace = {
                r: rnum,
                c: cnum,
                libelle: `R${rnum}C${cnum} - ${course.libelleCourt || course.libelle}`,
                heureDepart: course.heureDepart
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
  }, [token, days, selectedDate]);

  useEffect(() => {
    if (token) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [token, loadData]);

  // Handle computing state auto-refresh every 5s while processing
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

  // Chevaux du Quinté du jour qui correspondent aux notes cibles
  const priorityHorses = useMemo(() => {
    if (!quintePronostic || stats.length === 0) return [];
    return quintePronostic
      .map(horse => {
        const rounded = Math.round(horse.score);
        const s = statsMap.get(rounded);
        return {
          horse,
          stat: s,
          isTarget: s ? s.quinteRate >= 40 || s.placeRate >= 40 || s.winRate >= 20 : false,
        };
      })
      .filter(item => item.isTarget)
      .sort((a, b) => (b.stat?.quinteRate || 0) - (a.stat?.quinteRate || 0));
  }, [quintePronostic, statsMap, stats]);

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
            Les statistiques détaillées de l'IA 2 et les notes cibles sont réservées aux membres premium.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0E10]">
      {/* Header Sticky */}
      <div className="glass-panel border-b border-white/5 pt-safe-top sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Trophy className="text-[#F5C518]" size={24} />
              Stats IA 2 & Notes Cibles
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Historique des arrivées Quinté+ & Notes gagnantes à cibler
            </p>
          </div>
          <button 
            onClick={loadData}
            disabled={loading || computing}
            className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${
              (loading || computing) ? "opacity-50" : "hover:bg-white/10 active:scale-95"
            }`}
            title="Rafraîchir"
          >
            <RefreshCw size={18} className={(loading || computing) ? "animate-spin text-gray-400" : "text-white"} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 pb-24 md:pb-8 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Barre de Filtres : Période Historique + Date de la Course */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Période d'analyse */}
          <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h2 className="text-xs uppercase font-bold text-gray-400">Période Historique</h2>
                <p className="text-sm font-black text-white">{races} Quintés analysés</p>
              </div>
            </div>
            <div className="relative">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={loading}
                className="appearance-none bg-[#0E0E10] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs font-black text-white focus:outline-none focus:border-blue-500/50 disabled:opacity-50 cursor-pointer"
              >
                <option value={30}>1 Mois (30j)</option>
                <option value={90}>3 Mois (90j)</option>
                <option value={180}>6 Mois (180j)</option>
                <option value={365}>1 An (365j)</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date du Quinté */}
          <div className="bg-[#1C1C1E] rounded-xl border border-white/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(d => d.subtract(1, "day"))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
                title="Jour précédent"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center px-1">
                <span className="text-xs uppercase font-bold text-gray-400">Quinté du</span>
                <p className="text-sm font-black text-[#F5C518] capitalize">
                  {selectedDate.format("DD MMM YYYY")}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(d => d.add(1, "day"))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
                title="Jour suivant"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(dayjs())}
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                selectedDate.isSame(dayjs(), "day")
                  ? "bg-[#F5C518]/20 border-[#F5C518]/50 text-[#F5C518]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              Aujourd'hui
            </button>
          </div>

        </div>

        {/* Bannière de calcul en arrière-plan */}
        {computing && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <RefreshCw className="animate-spin text-blue-400 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="text-sm font-bold text-blue-400">Actualisation de l'historique en cours</h3>
              <p className="text-xs text-blue-400/80 mt-0.5">
                L'IA analyse les arrivées passées ({processed} courses traitées). Vos statistiques se mettent à jour automatiquement.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && stats.length === 0 ? (
          <Loader label="Récupération de l'historique Quinté+..." />
        ) : (
          <>
            {/* ======================================================== */}
            {/* 🎯 SECTION 1: NOTES À CIBLER POUR JOUER (PROPOSITION IA) */}
            {/* ======================================================== */}
            <div className="bg-gradient-to-br from-[#1C1C1E] to-[#141416] rounded-2xl border border-[#F5C518]/30 p-5 relative overflow-hidden shadow-[0_0_30px_rgba(245,197,24,0.08)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FDE68A] to-[#F5C518] flex items-center justify-center text-[#7A5200] shadow-md">
                    <Target size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                      Notes à Cibler pour vos Jeux
                    </h2>
                    <p className="text-xs text-gray-400">
                      Basé sur {races} courses Quinté+ passées ({days} derniers jours)
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-black self-start sm:self-auto">
                  <Sparkles size={14} />
                  Recommandation IA 2
                </div>
              </div>

              {/* Grille des 3 types de cibles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                
                {/* 1. Notes Cibles Quinté+ (Top 5) */}
                <div className="bg-[#0E0E10]/80 rounded-xl border border-emerald-500/20 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <Award size={14} /> Cible Quinté+ (Top 5)
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Notes avec la plus forte présence à l'arrivée du Quinté :</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetNotes?.topQuinte && targetNotes.topQuinte.length > 0 ? (
                      targetNotes.topQuinte.slice(0, 4).map(s => (
                        <div key={s.score} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                          <span className="text-sm font-black text-white">Note {s.score}</span>
                          <span className="text-[10px] block font-bold text-emerald-400">{s.quinteRate}% Q+</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">En cours de calcul...</span>
                    )}
                  </div>
                </div>

                {/* 2. Notes Bases Gagnantes (1er) */}
                <div className="bg-[#0E0E10]/80 rounded-xl border border-blue-500/20 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                        <Flame size={14} /> Base Gagnante
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Notes avec le plus fort taux de victoire (1ère place) :</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetNotes?.topWon && targetNotes.topWon.length > 0 ? (
                      targetNotes.topWon.slice(0, 4).map(s => (
                        <div key={s.score} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <span className="text-sm font-black text-white">Note {s.score}</span>
                          <span className="text-[10px] block font-bold text-blue-400">{s.winRate}% Victoire</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">En cours de calcul...</span>
                    )}
                  </div>
                </div>

                {/* 3. Notes Podiums / Placés (Top 3) */}
                <div className="bg-[#0E0E10]/80 rounded-xl border border-[#F5C518]/20 p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-[#F5C518] tracking-wider flex items-center gap-1.5">
                        <Star size={14} /> Bases Placés (Top 3)
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Notes les plus régulières sur le podium :</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetNotes?.topPlaced && targetNotes.topPlaced.length > 0 ? (
                      targetNotes.topPlaced.slice(0, 4).map(s => (
                        <div key={s.score} className="px-2.5 py-1 bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-lg text-center">
                          <span className="text-sm font-black text-white">Note {s.score}</span>
                          <span className="text-[10px] block font-bold text-[#F5C518]">{s.placeRate}% Placé</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">En cours de calcul...</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Conseil de jeu synthèse */}
              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex items-center gap-3 text-xs text-gray-300">
                <CheckCircle size={18} className="text-[#10B981] flex-shrink-0" />
                <span>
                  <strong>Conseil de jeu IA :</strong> Repérez les partants du Quinté portant l'une de ces notes cibles. Elles offrent historiquement le meilleur ratio régularité / gain pour construire vos Tiercés, Quartés et Quintés.
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 🏆 SECTION 2: QUINTÉ DU JOUR & ANALYSE DES CHEVAUX CIBLES */}
            {/* ======================================================== */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Course Quinté
                  {quinteRaceInfo && (
                    <span className="text-xs font-bold bg-[#F5C518]/20 border border-[#F5C518]/30 text-[#F5C518] px-2.5 py-1 rounded-md">
                      {quinteRaceInfo.libelle} {quinteRaceInfo.heureDepart ? `(${fmtHeure(quinteRaceInfo.heureDepart)})` : ""}
                    </span>
                  )}
                </h2>
              </div>

              {!quinteRaceInfo ? (
                <div className="bg-[#1C1C1E] rounded-2xl border border-white/5 p-8 text-center">
                  <EmptyState
                    icon="Calendar"
                    title={`Pas de Quinté trouvé le ${selectedDate.format("DD/MM/YYYY")}`}
                    subtitle="Aucune course support Quinté+ n'a été trouvée pour cette date."
                  />
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setSelectedDate(dayjs())}
                      className="px-4 py-2 bg-[#F5C518] text-[#7A5200] font-black rounded-xl text-xs hover:bg-[#F5C518]/90 transition-all"
                    >
                      Voir Quinté d'Aujourd'hui
                    </button>
                    <button
                      onClick={() => setSelectedDate(d => d.subtract(1, "day"))}
                      className="px-4 py-2 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-xs hover:bg-white/10 transition-all"
                    >
                      Voir Quinté d'Hier
                    </button>
                  </div>
                </div>
              ) : !quintePronostic ? (
                <div className="bg-[#1C1C1E] rounded-2xl border border-white/5 p-6 text-center text-gray-400 text-sm">
                  Le pronostic IA pour cette course Quinté n'est pas encore disponible.
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Encadré spécial : Chevaux Cibles du jour */}
                  {priorityHorses.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Award size={18} className="text-emerald-400" />
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          Chevaux cibles prioritaires pour le Quinté du jour
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {priorityHorses.map(({ horse, stat }) => (
                          <div key={horse.numPmu} className="bg-[#0E0E10] border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5C518]/20 to-[#F5C518]/5 border border-[#F5C518]/40 flex items-center justify-center flex-shrink-0">
                              <span className="text-base font-black text-[#F5C518]">{horse.numPmu}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-black text-white truncate">{horse.nom}</h4>
                              <p className="text-[11px] text-gray-400">Note IA : <span className="text-white font-bold">{horse.score.toFixed(1)}</span></p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-black text-emerald-400">{stat?.quinteRate}% Q+</span>
                              <span className="text-[10px] block text-gray-500">{stat?.winRate}% Gagn.</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liste complète des partants avec probabilités historiques */}
                  <div className="bg-[#1C1C1E] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                    <div className="p-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>Partant / Note IA 2</span>
                      <div className="grid grid-cols-3 gap-6 text-center w-48 sm:w-64">
                        <span className="text-emerald-400">Quinté+</span>
                        <span className="text-[#F5C518]">Placé</span>
                        <span className="text-blue-400">Gagnant</span>
                      </div>
                    </div>

                    <div className="divide-y divide-white/5">
                      {quintePronostic.map((horse, idx) => {
                        const roundedScore = Math.round(horse.score);
                        const horseStats = statsMap.get(roundedScore);
                        const isTarget = horseStats ? horseStats.quinteRate >= 40 || horseStats.placeRate >= 40 : false;
                        
                        return (
                          <div 
                            key={horse.numPmu} 
                            className={`p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
                              isTarget ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]" : "hover:bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                              <div className="w-6 text-center font-bold text-gray-500 text-xs flex-shrink-0">
                                #{idx + 1}
                              </div>
                              <div className="w-9 h-9 rounded-xl bg-[#0E0E10] border border-white/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-black text-[#F5C518]">{horse.numPmu}</span>
                              </div>
                              <div className="truncate flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-black text-white text-sm truncate">{horse.nom}</h3>
                                  {isTarget && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex-shrink-0">
                                      🎯 Cible
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">
                                  Note IA 2 : <strong className="text-white">{horse.score.toFixed(1)}</strong>
                                  {horse.cote ? ` · Cote ${horse.cote.toFixed(1)}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full sm:w-64 flex-shrink-0">
                              {/* Taux Quinté */}
                              <div className="bg-[#0E0E10] rounded-lg py-1.5 px-2 text-center border border-white/5">
                                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Quinté</div>
                                <div className="text-xs sm:text-sm font-black text-emerald-400">
                                  {horseStats ? `${horseStats.quinteRate}%` : "—"}
                                </div>
                              </div>
                              {/* Taux Placé */}
                              <div className="bg-[#0E0E10] rounded-lg py-1.5 px-2 text-center border border-white/5">
                                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Placé</div>
                                <div className="text-xs sm:text-sm font-black text-[#F5C518]">
                                  {horseStats ? `${horseStats.placeRate}%` : "—"}
                                </div>
                              </div>
                              {/* Taux Gagnant */}
                              <div className="bg-[#0E0E10] rounded-lg py-1.5 px-2 text-center border border-white/5">
                                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Gagnant</div>
                                <div className="text-xs sm:text-sm font-black text-blue-400">
                                  {horseStats ? `${horseStats.winRate}%` : "—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-[#0E0E10]/70 border-t border-white/5 text-center text-[11px] text-gray-400">
                      Les pourcentages de réussite sont calculés exclusivement à partir des arrivées passées des courses Quinté+ sur les {days} derniers jours ({races} courses).
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* 📊 SECTION 3: CLASSEMENT EXHAUSTIF DES NOTES PASSÉES     */}
            {/* ======================================================== */}
            <div className="pt-4 border-t border-white/10">
              <div className="mb-4">
                <h2 className="text-xl font-black text-white">Classement Général des Notes Passées</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Taux d'arrivée réel selon la note attribuée par l'algorithme IA 2
                </p>
              </div>

              {stats.length === 0 ? (
                <EmptyState
                  icon="BarChart3"
                  title="Aucune statistique"
                  subtitle="Pas assez de données pour la période sélectionnée."
                  onRetry={loadData}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.map((s, index) => (
                    <div key={s.score} className="bg-[#1C1C1E] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-gray-500 w-5 text-center">#{index + 1}</span>
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                          <span className="text-sm font-black text-white">{s.score}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase">Note</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-300">
                            {s.count} partant{s.count > 1 ? "s" : ""}
                          </span>
                          <span className="block text-[10px] text-gray-500">
                            {s.quinte || 0} fois dans le Q+
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-center px-1">
                          <span className="text-[9px] uppercase font-bold text-gray-500">Quinté</span>
                          <span className="block text-xs font-black text-emerald-400">{s.quinteRate}%</span>
                        </div>
                        <div className="text-center px-1">
                          <span className="text-[9px] uppercase font-bold text-gray-500">Placé</span>
                          <span className="block text-xs font-black text-[#F5C518]">{s.placeRate}%</span>
                        </div>
                        <div className="text-center px-1">
                          <span className="text-[9px] uppercase font-bold text-gray-500">Gagnant</span>
                          <span className="block text-xs font-black text-blue-400">{s.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}

      </div>

      <AdBanner />
    </div>
  );
}
