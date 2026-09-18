"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, PlayCircle, Lock, LockOpen, BarChart3, CloudOff, Trophy } from "lucide-react";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiDate } from "@/lib/format";
import DatePicker from "@/components/DatePicker";
import RaceCard from "@/components/RaceCard";
import { Loader, EmptyState } from "@/components/ui";

export default function Pronostics() {
  const router = useRouter();
  const { token, isDemo } = useAuth();
  const [date, setDate] = useState(dayjs().startOf("day"));
  const [reunions, setReunions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => {
    if (token) {
      api.performance(token)
        .then(setPerf)
        .catch(() => {});
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.programme(apiDate(date), token);
      setReunions(res.reunions || []);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [date, token]);

  useEffect(() => {
    load();
  }, [load]);

  const flat = useMemo(() => {
    const out: any[] = [];
    reunions.forEach((r) => {
      const rNum = r.numExterne || r.numOfficiel;
      (r.courses || []).forEach((c: any) => {
        out.push({ ...c, _r: rNum, _hippo: r.hippodrome?.libelleCourt || r.hippodrome?.libelleLong });
      });
    });
    return out;
  }, [reunions]);

  // Mode démo : seulement les 3 premières courses du jour (toutes réunions confondues).
  const visible = useMemo(() => {
    if (!isDemo) return flat;
    return [...flat]
      .sort((a, b) => Number(a.heureDepart || 0) - Number(b.heureDepart || 0))
      .slice(0, 3);
  }, [flat, isDemo]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="glass-panel border-b border-white/5 pt-8 pb-4 sticky top-0 z-20">
        <h1 className="text-3xl font-black text-white px-6">Pronostics</h1>
        <p className="text-sm font-medium text-gray-400 px-6 mt-1 mb-4">Top 8 IA · Sélectionnez une course</p>
        
        <button
          onClick={() => router.push(isDemo ? "/paywall" : "/performance")}
          className="mx-6 mb-4 flex flex-row items-center gap-4 p-3.5 rounded-2xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 transition-all hover:bg-white/10 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
            {isDemo ? <Lock size={20} color="#fff" /> : <BarChart3 size={20} color="#fff" />}
          </div>
          <div className="flex-1 flex flex-col text-left">
            <span className="text-base font-black text-white group-hover:text-[#10B981] transition-colors">Performance IA · Quinté+</span>
            <span className="text-xs text-gray-400 font-semibold mt-0.5">
              {isDemo
                ? "Verrouillé · Débloquer l'accès complet"
                : perf && perf.races
                ? `${perf.winRate}% gagnants · ${perf.placeRate}% placés (${perf.days}j)`
                : "Fiabilité sur la course du Quinté+"}
            </span>
          </div>
          <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
        
        <DatePicker selected={date} onSelect={setDate} />
      </div>

      <div className="flex-1 p-6 pb-24 max-w-3xl mx-auto w-full">
        {loading ? (
          <Loader label="Chargement des courses..." />
        ) : error ? (
          <EmptyState icon="CloudOff" title="Erreur" subtitle={error} onRetry={load} />
        ) : flat.length === 0 ? (
          <EmptyState icon="Trophy" title="Aucune course" subtitle="Aucune course à cette date." />
        ) : (
          <div className="flex flex-col mt-2 max-w-7xl mx-auto w-full">
            {isDemo && (
              <button
                onClick={() => router.push("/paywall")}
                className="flex flex-row items-center gap-3 bg-gradient-to-r from-[#FDE68A]/10 to-[#F5C518]/10 rounded-2xl border border-[#F5C518]/30 p-4 mb-4 transition-all hover:bg-[#FDE68A]/20"
              >
                <PlayCircle size={22} className="text-[#F5C518] shrink-0" />
                <span className="flex-1 text-sm font-bold text-[#F5C518] text-left">
                  Mode démo · 3 courses. Touchez pour débloquer.
                </span>
                <LockOpen size={18} className="text-[#F5C518] shrink-0" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((c, i) => (
                <RaceCard
                  key={`R${c._r}C${c.numExterne || c.numOrdre}-${i}`}
                  course={c}
                  hippoLabel={`R${c._r} · ${c._hippo}`}
                  href={`/course?date=${apiDate(date)}&r=${c._r}&c=${c.numExterne || c.numOrdre}&libelle=${encodeURIComponent(c.libelle || c.libelleCourt || "")}&hippodrome=${encodeURIComponent(c._hippo || "")}&discipline=${encodeURIComponent(c.specialite || c.discipline || "")}&distance=${c.distance || ""}&heureDepart=${c.heureDepart || ""}&segment=pronostic`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
