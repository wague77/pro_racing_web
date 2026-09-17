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
      className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all ${
        hasQuinte ? "border-l-4 border-[#F59E0B]" : "border-l-4 border-transparent"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        hasQuinte ? "bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]" : "bg-[#E6F4EA]"
      }`}>
        <span className={`text-[16px] font-extrabold ${
          hasQuinte ? "text-[#92400E]" : "text-[#0A7A42]"
        }`}>
          R{reunion.numExterne || reunion.numOfficiel}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[17px] font-extrabold text-[#1C1C1E] truncate">
            {hippo.libelleCourt || hippo.libelleLong || "Réunion"}
          </h3>
          {hasQuinte && (
            <div className="flex items-center gap-1 bg-[#FDE68A] px-2 py-0.5 rounded-md flex-shrink-0 shadow-sm">
              <Star size={12} color="#7A5200" fill="#7A5200" />
              <span className="text-[10px] font-black text-[#7A5200] tracking-wider">QUINTÉ+</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-[#8E8E93] font-medium">
          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
            {nb} course{nb > 1 ? "s" : ""}
          </span>
          {reunion.pays && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              {reunion.pays}
            </span>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
        <ChevronRight size={20} color={T.color.muted} />
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F9]">
      <div className="bg-white border-b border-[#E5E5EA] pt-safe-top sticky top-0 z-40">
        <div className="flex items-start justify-between px-4 py-3">
          <div>
            <h1 className="text-[24px] font-extrabold text-[#1C1C1E]">Réunions</h1>
            <p className="text-[14px] text-[#8E8E93] mt-0.5 capitalize">
              {date.format("dddd D MMMM YYYY")}
            </p>
          </div>
          <div className="relative flex items-center gap-1.5 bg-[#E6F4EA] px-3 py-2 rounded-lg cursor-pointer hover:bg-[#D1E8DA] transition-colors">
            <CalendarIcon size={18} color={T.color.brand} />
            <span className="text-[14px] font-bold text-[#0A7A42]">Date</span>
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
          <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
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
