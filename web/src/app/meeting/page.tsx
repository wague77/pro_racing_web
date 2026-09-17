"use client";

import React, { useCallback, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Flag } from "lucide-react";
import RaceCard from "@/components/RaceCard";
import { EmptyState } from "@/components/ui";
import { favorites, courseKey, FavCourse } from "@/lib/favorites";

function MeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = searchParams.get("date") || "";
  const reunionStr = searchParams.get("reunion");
  const reunion = reunionStr ? JSON.parse(reunionStr) : null;
  const hippo = reunion?.hippodrome || {};
  const rNum = reunion?.numExterne || reunion?.numOfficiel;
  const [favKeys, setFavKeys] = useState<Set<string>>(new Set());

  const reloadFavs = useCallback(() => {
    const arr = favorites.getCourses();
    setFavKeys(new Set(arr.map((x) => x.key)));
  }, []);

  useEffect(() => {
    reloadFavs();
  }, [reloadFavs]);

  const toggleFav = (course: any) => {
    const cNum = course.numExterne || course.numOrdre;
    const item: FavCourse = {
      key: courseKey(date, rNum, cNum),
      date,
      r: rNum,
      c: cNum,
      libelle: course.libelle || course.libelleCourt,
      hippodrome: hippo.libelleCourt || hippo.libelleLong,
      discipline: course.specialite || course.discipline,
      distance: course.distance,
      heureDepart: course.heureDepart,
    };
    favorites.toggleCourse(item);
    reloadFavs();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7]">
      {/* Hero section */}
      <div className="relative h-[210px] bg-[#1C1C1E] flex flex-col justify-end p-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C1C1E]/30 to-[#1C1C1E]/85 z-0" />

        <div className="relative z-10 flex flex-col">
          <button
            onClick={() => router.back()}
            className="absolute top-0 left-0 -mt-10 w-10 h-10 rounded-full bg-black/35 flex items-center justify-center transition-opacity hover:opacity-80"
          >
            <ChevronLeft size={24} color="#fff" />
          </button>
          
          <div className="self-start bg-[#10B981] px-3 py-1 rounded-full mb-2">
            <span className="text-white font-extrabold text-base">R{rNum}</span>
          </div>
          
          <h1 className="text-2xl font-extrabold text-white line-clamp-2">
            {hippo.libelleCourt || hippo.libelleLong || "Réunion"}
          </h1>
          <p className="text-base text-white/85 mt-1">
            {reunion?.courses?.length || 0} courses · {reunion?.pays || "France"}
          </p>
        </div>
      </div>

      {!reunion || (reunion.courses || []).length === 0 ? (
        <EmptyState icon="Flag" title="Aucune course" subtitle="Programme indisponible." />
      ) : (
        <div className="p-5 flex flex-col gap-4 pb-10">
          {reunion.courses.map((item: any) => {
            const cNum = item.numExterne || item.numOrdre;
            const key = courseKey(date, rNum, cNum);
            return (
              <RaceCard
                key={cNum}
                course={item}
                date={date}
                r={rNum}
                hippoLabel={hippo.libelleCourt || hippo.libelleLong}
                isFav={favKeys.has(key)}
                onToggleFav={() => toggleFav(item)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Meeting() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full" /></div>}>
      <MeetingContent />
    </Suspense>
  );
}
