"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import RaceCard from "@/components/RaceCard";
import { OddsBadge, EmptyState } from "@/components/ui";
import { favorites, FavHorse, FavCourse } from "@/lib/favorites";
import { apiDate } from "@/lib/format";

type Seg = "chevaux" | "courses";

export default function Favoris() {
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>("chevaux");
  const [horses, setHorses] = useState<FavHorse[]>([]);
  const [courses, setCourses] = useState<FavCourse[]>([]);

  const reload = useCallback(() => {
    setHorses(favorites.getHorses());
    setCourses(favorites.getCourses());
  }, []);

  useEffect(() => {
    reload();
    // In web, we can listen to a custom event if we want cross-tab sync, 
    // but for now simple reload on mount is fine as we are in SPA.
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  const openHorse = (h: FavHorse) => {
    // Navigate to horse details if implemented, else just log for now
    console.log("Navigate to horse", h.nom);
  };

  const openCourse = (cse: FavCourse) => {
    router.push(
      `/course?date=${cse.date}&r=${cse.r}&c=${cse.c}&libelle=${encodeURIComponent(
        cse.libelle || ""
      )}&hippodrome=${encodeURIComponent(cse.hippodrome || "")}&discipline=${encodeURIComponent(
        cse.discipline || ""
      )}&distance=${cse.distance || ""}&heureDepart=${cse.heureDepart || ""}&segment=partants`
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7]">
      <div className="bg-[#1C1C1E] pt-8 pb-4 shadow-md sticky top-0 z-20">
        <h1 className="text-3xl font-extrabold text-white px-5">Favoris</h1>
        
        <div className="flex flex-row bg-black/25 rounded-lg p-1 mx-5 mt-4">
          {(["chevaux", "courses"] as Seg[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeg(s)}
              className={`flex-1 py-2 rounded-md transition-colors ${seg === s ? "bg-[#10B981]" : ""}`}
            >
              <span className={`font-bold text-sm truncate ${seg === s ? "text-white" : "text-white/70"}`}>
                {s === "chevaux" ? `Chevaux (${horses.length})` : `Courses (${courses.length})`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-24">
        {seg === "chevaux" ? (
          horses.length === 0 ? (
            <EmptyState
              icon="Heart"
              title="Aucun cheval favori"
              subtitle="Ajoutez des chevaux depuis le détail d'une course."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {horses.map((item) => (
                <button
                  key={item.key}
                  onClick={() => openHorse(item)}
                  className="flex flex-row items-center gap-4 bg-white rounded-md p-4 shadow-sm hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#1C1C1E] flex items-center justify-center shrink-0">
                    <span className="text-white font-extrabold text-lg">{item.numPmu}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-lg font-bold text-[#1C1C1E] truncate">{item.nom}</span>
                    <span className="text-sm text-[#8E8E93] mt-0.5 truncate">
                      {item.hippodrome} · R{item.r}C{item.c}
                      {item.driver ? ` · ${item.driver}` : ""}
                    </span>
                  </div>
                  <OddsBadge cote={item.cote ?? undefined} />
                </button>
              ))}
            </div>
          )
        ) : courses.length === 0 ? (
          <EmptyState
            icon="Heart"
            title="Aucune course favorite"
            subtitle="Ajoutez des courses depuis leur écran de détail."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {courses.map((item) => (
              <RaceCard
                key={item.key}
                course={{
                  numExterne: item.c,
                  libelle: item.libelle,
                  discipline: item.discipline,
                  specialite: item.discipline,
                  distance: item.distance,
                  heureDepart: item.heureDepart,
                }}
                hippoLabel={`R${item.r} · ${item.hippodrome}`}
                href={`/course?date=${item.date}&r=${item.r}&c=${item.c}&libelle=${encodeURIComponent(item.libelle || "")}&hippodrome=${encodeURIComponent(item.hippodrome || "")}&discipline=${encodeURIComponent(item.discipline || "")}&distance=${item.distance || ""}&heureDepart=${item.heureDepart || ""}&segment=partants`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
