"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Heart } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtHeure, fmtDistance, disciplineLabel } from "@/lib/format";
import { Loader, EmptyState } from "@/components/ui";
import { favorites, courseKey, horseKey, FavCourse, FavHorse } from "@/lib/favorites";
import { isPronoUnlocked, unlockProno, getRewardedToday, incrementRewardedToday, REWARDED_DAILY_LIMIT } from "@/lib/rewardUnlocks";

import { CouplesView, CotesView } from "./CourseViews";
import { PronosticView } from "./PronosticView";
import { ArriveeCard, ParticipantRow, RapportsCard, LockedFeature } from "./CourseComponents";

type Segment = "partants" | "pronostic" | "cotes" | "couples";
type Sort = "numero" | "cote";

function CourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isDemo } = useAuth();

  const date = searchParams.get("date") || "";
  const r = Number(searchParams.get("r"));
  const c = Number(searchParams.get("c"));
  const libelle = searchParams.get("libelle") || "";
  const hippodrome = searchParams.get("hippodrome") || "";
  const discipline = searchParams.get("discipline") || "";
  const distance = searchParams.get("distance") || "";
  const heureDepart = searchParams.get("heureDepart") || "";
  const initialSegment = (searchParams.get("segment") as Segment) || "partants";

  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [sort, setSort] = useState<Sort>("numero");
  
  const [participants, setParticipants] = useState<any[]>([]);
  const [selection, setSelection] = useState<any[]>([]);
  const [tocards, setTocards] = useState<any[]>([]);
  const [cotes, setCotes] = useState<{ analysis: any[]; aJouer: number[] }>({ analysis: [], aJouer: [] });
  const [arrivee, setArrivee] = useState<any[]>([]);
  const [rapports, setRapports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [favCourse, setFavCourse] = useState(false);
  const [favHorseKeys, setFavHorseKeys] = useState<Set<string>>(new Set());
  
  const [pronoUnlocked, setPronoUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [rewardsUsed, setRewardsUsed] = useState(0);

  const cKey = courseKey(date, r, c);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [pr, pro] = await Promise.all([
        api.participants(date, r, c, token),
        isDemo
          ? pronoUnlocked
            ? api.pronosticDemo(date, r, c, token)
            : Promise.resolve({ selection: [], tocards: [] })
          : api.pronostic(date, r, c, token),
      ]);
      setParticipants(pr.participants || []);
      setArrivee(pr.arrivee || []);
      setSelection(pro.selection || []);
      setTocards(pro.tocards || []);
      
      if (!isDemo) {
        api.cotesAnalysis(date, r, c, token)
          .then((ca) => setCotes({ analysis: ca.analysis || [], aJouer: ca.aJouer || [] }))
          .catch(() => setCotes({ analysis: [], aJouer: [] }));
      } else if (pronoUnlocked) {
        api.cotesDemo(date, r, c, token)
          .then((ca) => setCotes({ analysis: ca.analysis || [], aJouer: ca.aJouer || [] }))
          .catch(() => setCotes({ analysis: [], aJouer: [] }));
      } else {
        setCotes({ analysis: [], aJouer: [] });
      }
      
      if (pr.termine) {
        api.rapports(date, r, c, token)
          .then((rp) => setRapports(rp.rapports || []))
          .catch(() => setRapports([]));
      } else {
        setRapports([]);
      }
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, r, c, token, isDemo, pronoUnlocked]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPronoUnlocked(isPronoUnlocked(cKey));
    setRewardsUsed(getRewardedToday());
  }, [cKey]);

  const unlockWithAd = useCallback(async () => {
    if (unlocking) return;
    const used = getRewardedToday();
    setRewardsUsed(used);
    if (used >= REWARDED_DAILY_LIMIT) {
      alert(`Limite quotidienne atteinte. Vous avez utilisé vos ${REWARDED_DAILY_LIMIT} vidéos gratuites du jour. Revenez demain ou débloquez l'accès complet.`);
      return;
    }
    setUnlocking(true);
    try {
      // Simulate video ad display
      await new Promise(resolve => setTimeout(resolve, 1500));
      unlockProno(cKey);
      const n = incrementRewardedToday();
      setRewardsUsed(n);
      setPronoUnlocked(true);
    } finally {
      setUnlocking(false);
    }
  }, [unlocking, cKey]);

  const reloadFavs = useCallback(() => {
    setFavCourse(favorites.isCourse(courseKey(date, r, c)));
    const arr = favorites.getHorses();
    setFavHorseKeys(new Set(arr.map((x) => x.key)));
  }, [date, r, c]);

  useEffect(() => {
    reloadFavs();
  }, [reloadFavs]);

  const toggleCourseFav = () => {
    const item: FavCourse = {
      key: courseKey(date, r, c),
      date,
      r,
      c,
      libelle,
      hippodrome,
      discipline,
      distance: Number(distance) || undefined,
      heureDepart: Number(heureDepart) || undefined,
    };
    favorites.toggleCourse(item);
    reloadFavs();
  };

  const toggleHorseFav = (part: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const item: FavHorse = {
      key: horseKey(date, r, c, part.numPmu),
      numPmu: part.numPmu,
      nom: part.nom,
      driver: part.driver,
      cote: part.cote,
      musique: part.musique,
      date,
      r,
      c,
      hippodrome,
      participant: part,
    };
    favorites.toggleHorse(item);
    reloadFavs();
  };

  const openHorse = (part: any) => {
    // router.push to horse page, similar to expo router
    // This is not in the scope of immediate requirements, but handled for navigation
    // Next.js equivalent:
    console.log("Navigating to horse", part.nom);
  };

  const sortedParts = useMemo(() => {
    const arr = [...participants];
    if (sort === "cote") {
      arr.sort((a, b) => (a.cote ?? 999) - (b.cote ?? 999));
    } else {
      arr.sort((a, b) => (a.numPmu ?? 0) - (b.numPmu ?? 0));
    }
    return arr;
  }, [participants, sort]);

  const segments: Segment[] = ["partants", "pronostic", "cotes", "couples"];

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7]">
      {/* Header */}
      <div className="bg-[#1C1C1E] px-5 pt-8 pb-4 sticky top-0 z-20">
        <div className="flex flex-row items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
          >
            <ChevronLeft size={24} color="#fff" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white/80">
              {hippodrome} · R{r}C{c}
            </h2>
            <h1 className="text-xl font-extrabold text-white truncate">
              {libelle || `Course ${c}`}
            </h1>
          </div>
          <button
            onClick={toggleCourseFav}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-opacity hover:opacity-80"
          >
            <Heart size={20} fill={favCourse ? "#FF3B30" : "none"} color={favCourse ? "#FF3B30" : "#fff"} />
          </button>
        </div>

        <div className="flex flex-row flex-wrap gap-1.5 mt-3">
          {heureDepart && <span className="text-white/90 text-base font-semibold">{fmtHeure(Number(heureDepart))}</span>}
          {distance && <span className="text-white/90 text-base font-semibold">· {fmtDistance(Number(distance))}</span>}
          {discipline && <span className="text-white/90 text-base font-semibold">· {disciplineLabel(discipline, discipline)}</span>}
        </div>

        {/* Segmented control */}
        <div className="flex flex-row bg-black/25 rounded-lg p-1 mt-4">
          {segments.map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={`flex-1 py-2 rounded-md transition-colors ${segment === s ? "bg-white" : ""}`}
            >
              <span className={`font-bold text-sm truncate ${segment === s ? "text-[#1C1C1E]" : "text-white/90"}`}>
                {s === "partants" ? "Partants" : s === "pronostic" ? "Prono IA" : s === "cotes" ? "Cotes" : "Couplés"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader label="Chargement de la course..." />
      ) : error ? (
        <EmptyState icon="CloudOff" title="Erreur" subtitle={error} onRetry={() => load()} />
      ) : segment === "partants" ? (
        <div className="flex-1 flex flex-col p-5 pb-10 gap-2">
          {participants.length > 0 ? (
            <>
              {arrivee.length > 0 && <ArriveeCard arrivee={arrivee} />}
              {rapports.length > 0 && <RapportsCard rapports={rapports} />}
              <div className="flex flex-row gap-3 mb-3">
                {(["numero", "cote"] as Sort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-4 py-1.5 rounded-full shrink-0 transition-colors ${sort === s ? "bg-[#10B981]" : "bg-[#EBEBEF]"}`}
                  >
                    <span className={`font-bold text-base ${sort === s ? "text-white" : "text-[#3A3A3C]"}`}>
                      {s === "numero" ? "N°" : "Cote"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {sortedParts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sortedParts.map((item) => (
                <ParticipantRow
                  key={item.numPmu}
                  part={item}
                  isFav={favHorseKeys.has(horseKey(date, r, c, item.numPmu))}
                  onFav={(e) => toggleHorseFav(item, e)}
                  onPress={() => openHorse(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon="Users" title="Aucun partant" subtitle="Partants non disponibles." />
          )}
        </div>
      ) : isDemo && segment === "cotes" && !pronoUnlocked ? (
        <LockedFeature
          title="Analyse des cotes verrouillée"
          subtitle="L'évolution des cotes, les cotes cibles et les numéros à jouer sont réservés à l'accès complet."
          onUnlock={() => router.push("/paywall")}
          onWatchAd={unlockWithAd}
          watching={unlocking}
          remaining={Math.max(0, REWARDED_DAILY_LIMIT - rewardsUsed)}
        />
      ) : isDemo && segment === "pronostic" && !pronoUnlocked ? (
        <LockedFeature
          title="Pronostic IA verrouillé"
          subtitle="Le Top 8 IA, les Tocards et les scores de confiance sont réservés à l'accès complet."
          onUnlock={() => router.push("/paywall")}
          onWatchAd={unlockWithAd}
          watching={unlocking}
          remaining={Math.max(0, REWARDED_DAILY_LIMIT - rewardsUsed)}
        />
      ) : isDemo && segment === "couples" && !pronoUnlocked ? (
        <LockedFeature
          title="Couplés 90% verrouillés"
          subtitle="Les combinaisons de couplés basées sur le classement des cotes sont réservées à l'accès complet."
          onUnlock={() => router.push("/paywall")}
          onWatchAd={unlockWithAd}
          watching={unlocking}
          remaining={Math.max(0, REWARDED_DAILY_LIMIT - rewardsUsed)}
        />
      ) : segment === "couples" ? (
        <CouplesView data={cotes} />
      ) : segment === "pronostic" ? (
        <PronosticView selection={selection} tocards={tocards} arrivee={arrivee} />
      ) : (
        <CotesView data={cotes} />
      )}
    </div>
  );
}

export default function Course() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full" /></div>}>
      <CourseContent />
    </Suspense>
  );
}
