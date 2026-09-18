"use client";

import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { ChevronRight, Calendar as CalendarIcon, Star } from "lucide-react";
import { T } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiDate, isQuintePlus } from "@/lib/format";
import DatePicker from "@/components/DatePicker";
import { EmptyState, Loader } from "@/components/ui";
import AdBanner from "@/components/AdBanner";
import Link from "next/link";

function MeetingCard({ reunion, date }: { reunion: any; date: dayjs.Dayjs }) {
  const hippo = reunion.hippodrome || {};
  const nb = reunion.courses?.length || 0;
  const hasQuinte = Array.isArray(reunion.courses) && reunion.courses.some(isQuintePlus);

  return (
    <Link
      href={`/meeting?date=${apiDate(date)}&reunion=${encodeURIComponent(JSON.stringify(reunion))}`}
      className={`flex items-center gap-3 glass-card rounded-2xl p-4 transition-transform hover:scale-[1.02] group ${
        hasQuinte ? "ring-2 ring-[#F5C518]" : ""
      }`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
        hasQuinte ? "bg-gradient-to-br from-[#FDE68A] to-[#F5C518]" : "bg-white/10"
      }`}>
        <span className={`text-xl font-black ${
          hasQuinte ? "text-[#7A5200]" : "text-white"
        }`}>
          R{reunion.numExterne || reunion.numOfficiel}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-[#10B981] transition-colors">
              {hippo.libelleCourt || hippo.libelleLong || "Réunion"}
            </h3>
            {hasQuinte && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-[#FDE68A] to-[#F5C518] px-2 py-0.5 rounded-md flex-shrink-0 shadow-sm">
                <Star size={12} color="#7A5200" fill="#7A5200" />
                <span className="text-[10px] font-black text-[#7A5200] tracking-wider">QUINTÉ+</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
          <span className="bg-white/10 px-2.5 py-0.5 rounded-md text-gray-300">
            {nb} course{nb > 1 ? "s" : ""}
          </span>
          {reunion.pays && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
              {reunion.pays}
            </span>
          )}
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
        <ChevronRight size={22} color="#9CA3AF" />
      </div>
    </Link>
  );
}

export default function Reunions() {
  const router = useRouter();
  const { token } = useAuth();
  const [date, setDate] = useState(dayjs().startOf("day"));
  const [reunions, setReunions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myExpiry, setMyExpiry] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.me(token);
      setMyExpiry(res.expires_at || null);
    } catch {
      /* ignore */
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
    loadMe();
  }, [load, loadMe]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="glass-panel border-b border-white/5 pt-safe-top sticky top-0 z-40">
        <div className="flex items-start justify-between px-4 py-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Réunions</h1>
            <p className="text-sm text-gray-400 mt-1 capitalize font-medium">
              {date.format("dddd D MMMM YYYY")}
            </p>
          </div>
          <div className="relative flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors border border-white/5">
            <CalendarIcon size={18} className="text-[#10B981]" />
            <span className="text-sm font-bold text-white">Date</span>
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={date.format("YYYY-MM-DD")}
              onChange={(e) => {
                if (e.target.value) setDate(dayjs(e.target.value));
              }}
            />
          </div>
        </div>
        <DatePicker selected={date} onSelect={setDate} />
      </div>
      
      {myExpiry && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Star size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-100">Accès Premium Actif</p>
              <p className="text-xs text-emerald-500/70">
                Expire le {new Date(myExpiry).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 pb-24 md:pb-8">
        {loading ? (
          <Loader label="Chargement du programme..." />
        ) : error ? (
          <EmptyState
            icon="AlertCircle"
            title="Impossible de charger"
            subtitle={error}
            onRetry={() => load()}
          />
        ) : reunions.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title="Aucune réunion"
            subtitle="Aucune réunion prévue à cette date."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full mt-2">
            {reunions.map((r) => (
              <MeetingCard key={String(r.numOfficiel)} reunion={r} date={date} />
            ))}
          </div>
        )}
      </div>

      <AdBanner />
    </div>
  );
}
