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
    <div className="flex-1 flex flex-col bg-[#F2F2F7]">
      <div className="bg-[#1C1C1E] pt-8 pb-3 shadow-md sticky top-0 z-20">
        <h1 className="text-3xl font-extrabold text-white px-5">Pronostics</h1>
        <p className="text-base text-white/70 px-5 mt-0.5 mb-3">Top 8 IA · sélectionnez une course</p>
        
        <button
          onClick={() => router.push(isDemo ? "/paywall" : "/performance")}
          className="mx-5 mb-3 flex flex-row items-center gap-4 p-3 rounded-lg bg-[#E6F4EA] transition-colors hover:bg-[#D1EADB]"
        >
          <div className="w-9 h-9 rounded-[10px] bg-[#10B981] flex items-center justify-center shrink-0">
            {isDemo ? <Lock size={18} color="#fff" /> : <BarChart3 size={18} color="#fff" />}
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-base font-extrabold text-[#0A7A42]">Performance IA · Quinté+</span>
            <span className="text-sm text-[#10B981] font-semibold mt-0.5">
              {isDemo
                ? "Verrouillé · Débloquer l'accès complet"
                : perf && perf.races
                ? `${perf.winRate}% gagnants · ${perf.placeRate}% placés (${perf.days}j)`
                : "Fiabilité sur la course du Quinté+"}
            </span>
          </div>
          <ChevronRight size={18} color="#8E8E93" />
        </button>
        
        <DatePicker selected={date} onSelect={setDate} />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-24">
        {loading ? (
          <Loader label="Chargement des courses..." />
        ) : error ? (
          <EmptyState icon="CloudOff" title="Erreur" subtitle={error} onRetry={load} />
        ) : flat.length === 0 ? (
          <EmptyState icon="Trophy" title="Aucune course" subtitle="Aucune course à cette date." />
        ) : (
          <div className="flex flex-col gap-4">
            {isDemo && (
              <button
                onClick={() => router.push("/paywall")}
                className="flex flex-row items-center gap-3 bg-[#FEF3C7] rounded-lg border border-[#FDE68A] p-3 mb-1 transition-colors hover:bg-[#FDE68A]"
              >
                <PlayCircle size={18} color="#7A5200" className="shrink-0" />
                <span className="flex-1 text-sm font-bold text-[#7A5200] text-left">
                  Mode démo · 3 courses. Touchez pour débloquer tout.
                </span>
                <LockOpen size={16} color="#7A5200" className="shrink-0" />
              </button>
            )}

            {visible.map((c, i) => (
              <RaceCard
                key={`R${c._r}C${c.numExterne || c.numOrdre}-${i}`}
                course={c}
                hippoLabel={`R${c._r} · ${c._hippo}`}
                href={`/course?date=${apiDate(date)}&r=${c._r}&c=${c.numExterne || c.numOrdre}&libelle=${encodeURIComponent(c.libelle || c.libelleCourt || "")}&hippodrome=${encodeURIComponent(c._hippo || "")}&discipline=${encodeURIComponent(c.specialite || c.discipline || "")}&distance=${c.distance || ""}&heureDepart=${c.heureDepart || ""}&segment=pronostic`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
