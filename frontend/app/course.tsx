import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, RefreshControl, Alert } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fmtHeure, fmtDistance, disciplineLabel } from "@/src/lib/format";
import { OddsBadge, EmptyState, Loader } from "@/src/components/ui";
import { favorites, courseKey, horseKey, FavCourse, FavHorse } from "@/src/favorites";
import { useRewarded } from "@/src/ads/useRewarded";
import { hasAds } from "@/src/ads/ads";
import { isPronoUnlocked, unlockProno, getRewardedToday, incrementRewardedToday, REWARDED_DAILY_LIMIT } from "@/src/ads/rewardUnlocks";

type Segment = "partants" | "pronostic" | "cotes" | "couples";
type Sort = "numero" | "cote";

const CAT: Record<string, { color: string; bg: string; label: string }> = {
  favori: { color: "#0A7A42", bg: "#E6F4EC", label: "Favori" },
  outsider: { color: "#B45309", bg: "#FEF3C7", label: "Outsider" },
  tocard: { color: "#B91C1C", bg: "#FEE2E2", label: "Tocard" },
  inconnu: { color: "#6B7280", bg: "#F1F1F3", label: "—" },
};
const cat = (k?: string) => CAT[k || "inconnu"] || CAT.inconnu;

export default function Course() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, isDemo } = useAuth();
  const p = useLocalSearchParams<{
    date: string;
    r: string;
    c: string;
    libelle: string;
    hippodrome: string;
    discipline: string;
    distance: string;
    heureDepart: string;
    segment: string;
  }>();
  const date = p.date;
  const r = Number(p.r);
  const c = Number(p.c);

  const [segment, setSegment] = useState<Segment>((p.segment as Segment) || "partants");
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
  const { showRewarded } = useRewarded();
  const cKey = courseKey(date, r, c);

  const load = useCallback(
    async (silent = false) => {
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
          api
            .cotesAnalysis(date, r, c, token)
            .then((ca) => setCotes({ analysis: ca.analysis || [], aJouer: ca.aJouer || [] }))
            .catch(() => setCotes({ analysis: [], aJouer: [] }));
        } else if (pronoUnlocked) {
          api
            .cotesDemo(date, r, c, token)
            .then((ca) => setCotes({ analysis: ca.analysis || [], aJouer: ca.aJouer || [] }))
            .catch(() => setCotes({ analysis: [], aJouer: [] }));
        } else {
          setCotes({ analysis: [], aJouer: [] });
        }
        if (pr.termine) {
          api
            .rapports(date, r, c, token)
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
    },
    [date, r, c, token, isDemo, pronoUnlocked]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Vérifie si ce pronostic a déjà été débloqué (pub récompensée) sur cet appareil.
  useEffect(() => {
    let active = true;
    isPronoUnlocked(cKey).then((v) => {
      if (active) setPronoUnlocked(v);
    });
    getRewardedToday().then((n) => {
      if (active) setRewardsUsed(n);
    });
    return () => {
      active = false;
    };
  }, [cKey]);

  // Débloque le pronostic IA de CETTE course après visionnage d'une vidéo récompensée.
  const unlockWithAd = useCallback(async () => {
    if (unlocking) return;
    const used = await getRewardedToday();
    setRewardsUsed(used);
    if (used >= REWARDED_DAILY_LIMIT) {
      Alert.alert(
        "Limite quotidienne atteinte",
        `Vous avez utilisé vos ${REWARDED_DAILY_LIMIT} vidéos gratuites du jour. Revenez demain ou débloquez l'accès complet.`
      );
      return;
    }
    setUnlocking(true);
    try {
      const earned = await showRewarded();
      if (earned) {
        await unlockProno(cKey);
        const n = await incrementRewardedToday();
        setRewardsUsed(n);
        setPronoUnlocked(true); // relance load() (dépendance) → récupère le pronostic
      } else {
        Alert.alert(
          "Pronostic non débloqué",
          "Regardez la vidéo jusqu'au bout pour débloquer gratuitement ce pronostic IA."
        );
      }
    } finally {
      setUnlocking(false);
    }
  }, [unlocking, showRewarded, cKey]);

  const reloadFavs = useCallback(async () => {
    setFavCourse(await favorites.isCourse(courseKey(date, r, c)));
    const arr = await favorites.getHorses();
    setFavHorseKeys(new Set(arr.map((x) => x.key)));
  }, [date, r, c]);

  useFocusEffect(
    useCallback(() => {
      reloadFavs();
    }, [reloadFavs])
  );

  const toggleCourseFav = async () => {
    const item: FavCourse = {
      key: courseKey(date, r, c),
      date,
      r,
      c,
      libelle: p.libelle,
      hippodrome: p.hippodrome,
      discipline: p.discipline,
      distance: Number(p.distance) || undefined,
      heureDepart: Number(p.heureDepart) || undefined,
    };
    await favorites.toggleCourse(item);
    reloadFavs();
  };

  const toggleHorseFav = async (part: any) => {
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
      hippodrome: p.hippodrome,
      participant: part,
    };
    await favorites.toggleHorse(item);
    reloadFavs();
  };

  const openHorse = (part: any) => {
    router.push({
      pathname: "/horse",
      params: {
        participant: JSON.stringify(part),
        date,
        r: String(r),
        c: String(c),
        hippodrome: p.hippodrome || "",
      },
    } as any);
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

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <View style={styles.headRow}>
          <Pressable testID="back-button" hitSlop={12} onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headSub}>
              {p.hippodrome} · R{r}C{c}
            </Text>
            <Text style={styles.headTitle} numberOfLines={1}>
              {p.libelle || `Course ${c}`}
            </Text>
          </View>
          <Pressable testID="fav-course-button" hitSlop={12} onPress={toggleCourseFav} style={styles.iconBtn}>
            <Ionicons name={favCourse ? "heart" : "heart-outline"} size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          {p.heureDepart ? <Text style={styles.metaTxt}>{fmtHeure(Number(p.heureDepart))}</Text> : null}
          {p.distance ? <Text style={styles.metaTxt}>· {fmtDistance(Number(p.distance))}</Text> : null}
          {p.discipline ? (
            <Text style={styles.metaTxt}>· {disciplineLabel(p.discipline, p.discipline)}</Text>
          ) : null}
        </View>

        {/* Segmented control */}
        <View style={styles.segment}>
          {(["partants", "pronostic", "cotes", "couples"] as Segment[]).map((s) => (
            <Pressable
              key={s}
              testID={`segment-${s}`}
              style={[styles.segBtn, segment === s && styles.segBtnActive]}
              onPress={() => setSegment(s)}
            >
              <Text
                numberOfLines={1}
                style={[styles.segTxt, segment === s && styles.segTxtActive]}
              >
                {s === "partants"
                  ? "Partants"
                  : s === "pronostic"
                  ? "Prono IA"
                  : s === "cotes"
                  ? "Cotes"
                  : "Couplés 90%"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <Loader label="Chargement de la course..." />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Erreur" subtitle={error} onRetry={() => load()} />
      ) : segment === "partants" ? (
        <FlatList
          data={sortedParts}
          keyExtractor={(x) => String(x.numPmu)}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: T.space.sm }} />}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Aucun partant" subtitle="Partants non disponibles." />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={T.color.brand}
            />
          }
          ListHeaderComponent={
            participants.length > 0 ? (
              <>
                {arrivee.length > 0 ? <ArriveeCard arrivee={arrivee} /> : null}
                {rapports.length > 0 ? <RapportsCard rapports={rapports} /> : null}
                <View style={styles.sortRow}>
                  {(["numero", "cote"] as Sort[]).map((s) => (
                    <Pressable
                      key={s}
                      testID={`sort-${s}`}
                      style={[styles.sortChip, sort === s && styles.sortChipActive]}
                      onPress={() => setSort(s)}
                    >
                      <Text style={[styles.sortTxt, sort === s && styles.sortTxtActive]}>
                        {s === "numero" ? "N°" : "Cote"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null
          }
          renderItem={({ item }) => (
            <ParticipantRow
              part={item}
              isFav={favHorseKeys.has(horseKey(date, r, c, item.numPmu))}
              onFav={() => toggleHorseFav(item)}
              onPress={() => openHorse(item)}
            />
          )}
        />
      ) : isDemo && segment === "cotes" && !pronoUnlocked ? (
        <LockedFeature
          title="Analyse des cotes verrouillée"
          subtitle="L'évolution des cotes, les cotes cibles et les numéros à jouer sont réservés à l'accès complet."
          onUnlock={() => router.push("/paywall" as any)}
          onWatchAd={hasAds ? unlockWithAd : undefined}
          watching={unlocking}
          remaining={Math.max(0, REWARDED_DAILY_LIMIT - rewardsUsed)}
        />
      ) : isDemo && segment === "pronostic" && !pronoUnlocked ? (
        <LockedFeature
          title="Pronostic IA verrouillé"
          subtitle="Le Top 8 IA, les Tocards et les scores de confiance sont réservés à l'accès complet."
          onUnlock={() => router.push("/paywall" as any)}
          onWatchAd={hasAds ? unlockWithAd : undefined}
          watching={unlocking}
          remaining={Math.max(0, REWARDED_DAILY_LIMIT - rewardsUsed)}
        />
      ) : isDemo && segment === "couples" && !pronoUnlocked ? (
        <LockedFeature
          title="Couplés 90% verrouillés"
          subtitle="Les combinaisons de couplés basées sur le classement des cotes sont réservées à l'accès complet."
          onUnlock={() => router.push("/paywall" as any)}
          onWatchAd={hasAds ? unlockWithAd : undefined}
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
    </View>
  );
}

function ArriveeCard({ arrivee }: { arrivee: any[] }) {
  const medal = (o: number) =>
    o === 1 ? "#D4AF37" : o === 2 ? "#A8A8AD" : o === 3 ? "#CD7F32" : T.color.surfaceTertiary;
  return (
    <View testID="arrivee-card" style={styles.arriveeCard}>
      <View style={styles.arriveeHead}>
        <Ionicons name="flag" size={16} color="#fff" />
        <Text style={styles.arriveeTitle}>Arrivée officielle</Text>
      </View>
      {arrivee.map((a) => (
        <View key={a.numPmu} testID={`arrivee-${a.ordre}`} style={styles.arriveeRow}>
          <View style={[styles.arriveePos, { backgroundColor: medal(a.ordre) }]}>
            <Text style={[styles.arriveePosTxt, a.ordre <= 3 ? { color: "#fff" } : { color: T.color.onSurface }]}>
              {a.ordre}
            </Text>
          </View>
          <View style={styles.arriveeNum}>
            <Text style={styles.arriveeNumTxt}>{a.numPmu}</Text>
          </View>
          <Text style={styles.arriveeName} numberOfLines={1}>
            {a.nom}
          </Text>
          {a.cote != null ? <Text style={styles.arriveeCote}>{a.cote.toFixed(1)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ParticipantRow({
  part,
  isFav,
  onFav,
  onPress,
}: {
  part: any;
  isFav: boolean;
  onFav: () => void;
  onPress: () => void;
}) {
  const scratched = part.statut && part.statut !== "PARTANT";
  return (
    <Pressable
      testID={`participant-${part.numPmu}`}
      style={[styles.pRow, scratched && { opacity: 0.5 }]}
      onPress={onPress}
    >
      <View style={styles.pNum}>
        <Text style={styles.pNumTxt}>{part.numPmu}</Text>
      </View>
      {part.ordreArrivee ? (
        <View
          testID={`finish-${part.numPmu}`}
          style={[
            styles.finishBadge,
            part.ordreArrivee === 1 && { backgroundColor: "#D4AF37" },
            part.ordreArrivee === 2 && { backgroundColor: "#A8A8AD" },
            part.ordreArrivee === 3 && { backgroundColor: "#CD7F32" },
          ]}
        >
          <Text style={styles.finishTxt}>{part.ordreArrivee}e</Text>
        </View>
      ) : null}
      {part.urlCasaque ? (
        <Image source={part.urlCasaque} style={styles.casaque} contentFit="contain" />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.pName} numberOfLines={1}>
          {part.nom}
        </Text>
        <Text style={styles.pMeta} numberOfLines={1}>
          {part.driver || part.entraineur}
        </Text>
        {part.musique ? (
          <Text style={styles.musique} numberOfLines={1}>
            {part.musique}
          </Text>
        ) : null}
      </View>
      <View style={styles.pRight}>
        <OddsBadge cote={part.cote} tendance={part.tendance} />
        <Pressable testID={`participant-${part.numPmu}-fav`} hitSlop={8} onPress={onFav} style={{ marginTop: 6 }}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? T.color.error : T.color.muted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const PARI_LABELS: Record<string, string> = {
  SIMPLE_GAGNANT: "Simple Gagnant",
  SIMPLE_PLACE: "Simple Placé",
  COUPLE_GAGNANT: "Couplé Gagnant",
  COUPLE_PLACE: "Couplé Placé",
  COUPLE_ORDRE: "Couplé Ordre",
  TRIO: "Trio",
  TIERCE: "Tiercé",
  QUARTE_PLUS: "Quarté+",
  QUINTE_PLUS: "Quinté+",
  DEUX_SUR_QUATRE: "2 sur 4",
  MULTI: "Multi",
};

function RapportsCard({ rapports }: { rapports: any[] }) {
  return (
    <View testID="rapports-card" style={styles.rapportsCard}>
      <View style={styles.rapportsHead}>
        <Ionicons name="cash-outline" size={16} color={T.color.brand} />
        <Text style={styles.rapportsTitle}>Rapports définitifs (pour 1€)</Text>
      </View>
      {rapports.map((p) => (
        <View key={p.typePari} style={styles.rapportRow}>
          <Text style={styles.rapportType}>{PARI_LABELS[p.typePari] || p.typePari}</Text>
          <View style={styles.rapportVals}>
            {p.rapports.map((rp: any, i: number) => (
              <View key={i} style={styles.rapportChip}>
                <Text style={styles.rapportComb}>{rp.combinaison}</Text>
                <Text style={styles.rapportDiv}>{rp.dividende.toFixed(2)}€</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function PronosticView({ selection, tocards, arrivee }: { selection: any[]; tocards: any[]; arrivee: any[] }) {
  if (!selection || selection.length === 0) {
    return (
      <EmptyState
        icon="analytics-outline"
        title="Pronostic indisponible"
        subtitle="Pas assez de données pour cette course."
      />
    );
  }
  const posByNum: Record<number, number> = {};
  arrivee.forEach((a) => {
    posByNum[a.numPmu] = a.ordre;
  });
  const finished = arrivee.length > 0;
  const [top, ...rest] = selection;

  // Bilan IA
  const topPos = posByNum[top.numPmu];
  const trio = selection.slice(0, 3).map((s) => s.numPmu);
  const trioHits = trio.filter((n) => posByNum[n] && posByNum[n] <= 3).length;

  // Écart entre position prédite (rang IA) et position réelle à l'arrivée (top 8)
  const top8 = selection.slice(0, 8);
  const ecarts = top8
    .map((s) => {
      const pos = posByNum[s.numPmu];
      return pos ? Math.abs(pos - s.rank) : null;
    })
    .filter((e): e is number => e !== null);
  const avgEcart = ecarts.length ? ecarts.reduce((a, b) => a + b, 0) / ecarts.length : null;

  return (
    <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}>
      {finished ? (
        <View testID="bilan-card" style={styles.bilanCard}>
          <Text style={styles.bilanTitle}>Bilan du pronostic IA</Text>
          <View style={styles.bilanRow}>
            <View style={styles.bilanItem}>
              <Ionicons
                name={topPos === 1 ? "trophy" : topPos && topPos <= 3 ? "ribbon" : "close-circle"}
                size={20}
                color={topPos === 1 ? "#D4AF37" : topPos && topPos <= 3 ? T.color.brand : T.color.muted}
              />
              <Text style={styles.bilanVal}>
                {topPos === 1 ? "Gagné" : topPos && topPos <= 3 ? `Placé ${topPos}e` : "Non placé"}
              </Text>
              <Text style={styles.bilanLbl}>Favori IA</Text>
            </View>
            <View style={styles.bilanDivider} />
            <View style={styles.bilanItem}>
              <Text style={styles.bilanBig}>{trioHits}/3</Text>
              <Text style={styles.bilanLbl}>{"Trio IA dans l'arrivée"}</Text>
            </View>
            <View style={styles.bilanDivider} />
            <View style={styles.bilanItem}>
              <Text style={styles.bilanBig}>{avgEcart != null ? avgEcart.toFixed(1) : "—"}</Text>
              <Text style={styles.bilanLbl}>Écart moyen top 8</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.disclaimer}>
          <Ionicons name="sparkles" size={14} color={T.color.brand} />
          <Text style={styles.disclaimerTxt}>Sélection algorithmique · analyse pondérée</Text>
        </View>
      )}

      {/* Légende catégories */}
      <View style={styles.legendRow}>
        {(["favori", "outsider", "tocard"] as const).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cat(k).color }]} />
            <Text style={styles.legendTxt}>{cat(k).label}</Text>
          </View>
        ))}
      </View>

      {/* Top pick hero */}
      <View testID="prono-top" style={styles.topCard}>
        <View style={styles.topBadgeRow}>
          <View style={styles.topRankBadge}>
            <Ionicons name="trophy" size={16} color="#fff" />
            <Text style={styles.topRankTxt}>Favori IA</Text>
          </View>
          <View style={[styles.catPill, { backgroundColor: cat(top.categorie).bg }]}>
            <Text style={[styles.catPillTxt, { color: cat(top.categorie).color }]}>
              {cat(top.categorie).label}
            </Text>
          </View>
        </View>
        <View style={styles.topRow}>
          <View style={styles.topNum}>
            <Text style={styles.topNumTxt}>{top.numPmu}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topName}>{top.nom}</Text>
            <Text style={styles.topDriver}>{top.driver}</Text>
          </View>
          {finished ? (
            <View style={styles.topResultCol}>
              <View style={styles.resultPill}>
                <Text style={styles.resultPillTxt}>{topPos ? `${topPos}e` : "NP"}</Text>
              </View>
              <EcartTag pos={topPos} rank={top.rank} light />
            </View>
          ) : (
            <View style={styles.confBox}>
              <Text style={styles.confVal}>{top.confidence}</Text>
              <Text style={styles.confLbl}>confiance</Text>
            </View>
          )}
        </View>
        <Text style={styles.topReason}>{top.reasoning}</Text>
        {top.cote != null ? <Text style={styles.topCote}>Cote {top.cote.toFixed(1)}</Text> : null}
      </View>

      {rest.map((s) => {
        const pos = posByNum[s.numPmu];
        return (
          <View key={s.numPmu} testID={`prono-rank-${s.rank}`} style={[styles.rankRow, { borderLeftWidth: 3, borderLeftColor: cat(s.categorie).color }]}>
            <Text style={styles.rankNum}>{s.rank}</Text>
            <View style={[styles.rankHorseNum, { backgroundColor: cat(s.categorie).bg }]}>
              <Text style={[styles.rankHorseNumTxt, { color: cat(s.categorie).color }]}>{s.numPmu}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName} numberOfLines={1}>
                {s.nom}
              </Text>
              <Text style={styles.rankReason} numberOfLines={1}>
                {s.reasoning}
              </Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${s.confidence}%` }]} />
              </View>
            </View>
            {finished ? (
              <View style={styles.rankResultCol}>
                <View
                  style={[
                    styles.rankResultBadge,
                    pos === 1 && { backgroundColor: "#D4AF37" },
                    pos && pos <= 3 && pos > 1 && { backgroundColor: T.color.brand },
                  ]}
                >
                  <Text style={[styles.rankResultTxt, pos && pos <= 3 ? { color: "#fff" } : null]}>
                    {pos ? `${pos}e` : "NP"}
                  </Text>
                </View>
                <EcartTag pos={pos} rank={s.rank} />
              </View>
            ) : (
              <View style={styles.rankScoreBox}>
                <Text style={styles.rankScore}>{s.score}</Text>
                {s.cote != null ? <Text style={styles.rankCote}>{s.cote.toFixed(1)}</Text> : null}
              </View>
            )}
          </View>
        );
      })}

      {tocards && tocards.length > 0 ? (
        <View testID="tocards-section" style={styles.tocardsBox}>
          <View style={styles.tocardsHead}>
            <Ionicons name="flash" size={16} color={T.color.warning} />
            <Text style={styles.tocardsTitle}>Tocards à jouer</Text>
          </View>
          <Text style={styles.tocardsSub}>Outsiders hors top 8 · grosses cotes à surveiller</Text>
          {tocards.map((t) => {
            const pos = finished ? posByNum[t.numPmu] : undefined;
            return (
              <View key={t.numPmu} testID={`tocard-${t.numPmu}`} style={styles.tocardRow}>
                <View style={[styles.tocardNum, { backgroundColor: cat(t.categorie).color }]}>
                  <Text style={styles.tocardNumTxt}>{t.numPmu}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tocardName} numberOfLines={1}>
                    {t.nom}
                  </Text>
                  <Text style={styles.tocardReason} numberOfLines={1}>
                    {t.reasoning}
                  </Text>
                </View>
                {finished ? (
                  <View style={styles.tocardResult}>
                    <Text style={styles.tocardResultTxt}>{pos ? `${pos}e` : "NP"}</Text>
                  </View>
                ) : (
                  <View style={styles.tocardCote}>
                    <Text style={styles.tocardCoteTxt}>{t.cote != null ? t.cote.toFixed(1) : "—"}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

function EcartTag({ pos, rank, light }: { pos?: number; rank: number; light?: boolean }) {
  if (!pos) return null;
  const d = pos - rank; // >0 : arrivé moins bien que prévu · <0 : mieux que prévu
  const abs = Math.abs(d);
  const color = abs === 0 ? "#0A7A42" : abs <= 2 ? "#B45309" : "#B91C1C";
  const bg = abs === 0 ? "#E6F4EC" : abs <= 2 ? "#FEF3C7" : "#FEE2E2";
  return (
    <View
      testID={`ecart-${rank}`}
      style={[styles.ecartTag, { backgroundColor: light ? "rgba(255,255,255,0.22)" : bg }]}
    >
      <Ionicons
        name={d === 0 ? "checkmark-circle" : d > 0 ? "arrow-down" : "arrow-up"}
        size={11}
        color={light ? "#fff" : color}
      />
      <Text style={[styles.ecartTxt, { color: light ? "#fff" : color }]}>
        {abs === 0 ? "exact" : `écart ${abs}`}
      </Text>
    </View>
  );
}

const SIGNAL: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  jouer: { color: "#0A7A42", bg: "#E6F4EC", label: "À jouer", icon: "trending-down" },
  surveiller: { color: "#1D4ED8", bg: "#DBEAFE", label: "À surveiller", icon: "eye-outline" },
  eviter: { color: "#B91C1C", bg: "#FEE2E2", label: "À éviter", icon: "trending-up" },
  neutre: { color: "#6B7280", bg: "#F1F1F3", label: "Neutre", icon: "remove-outline" },
};

function LockedFeature({
  title,
  subtitle,
  onUnlock,
  onWatchAd,
  watching,
  remaining,
}: {
  title: string;
  subtitle: string;
  onUnlock: () => void;
  onWatchAd?: () => void;
  watching?: boolean;
  remaining?: number;
}) {
  const limitReached = typeof remaining === "number" && remaining <= 0;
  return (
    <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}>
      {/* Aperçu flouté simulé */}
      <View style={[styles.lockGhost, { pointerEvents: "none" }]}>
        {[0.9, 0.6, 0.4].map((o, i) => (
          <View key={i} style={[styles.lockGhostRow, { opacity: o }]}>
            <View style={styles.lockGhostNum} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.lockGhostBar, { width: "70%" }]} />
              <View style={[styles.lockGhostBar, { width: "45%" }]} />
            </View>
            <View style={styles.lockGhostPill} />
          </View>
        ))}
      </View>

      <View style={styles.lockCard}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={26} color="#fff" />
        </View>
        <Text style={styles.lockTitle}>{title}</Text>
        <Text style={styles.lockSub}>{subtitle}</Text>
        {onWatchAd ? (
          <>
            <Pressable
              testID="watch-ad-cta"
              style={[styles.watchAdBtn, (watching || limitReached) && { opacity: 0.5 }]}
              onPress={onWatchAd}
              disabled={watching || limitReached}
            >
              <Ionicons name="play-circle" size={18} color="#7A5200" />
              <Text style={styles.watchAdBtnTxt}>
                {watching
                  ? "Chargement de la vidéo…"
                  : limitReached
                  ? "Limite du jour atteinte · revenez demain"
                  : "Regarder une vidéo pour débloquer ce pronostic"}
              </Text>
            </Pressable>
            {typeof remaining === "number" && !limitReached ? (
              <Text style={styles.watchAdHint}>{remaining} vidéo(s) gratuite(s) restante(s) aujourd&apos;hui</Text>
            ) : null}
          </>
        ) : null}
        <Pressable testID="unlock-cta" style={styles.lockBtn} onPress={onUnlock}>
          <Ionicons name="lock-open" size={16} color="#fff" />
          <Text style={styles.lockBtnTxt}>Débloquer l&apos;accès complet</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CoupHorse({ pos, h }: { pos: number; h: any }) {
  return (
    <View style={styles.coupHorseRow}>
      <View style={styles.coupRank}>
        <Text style={styles.coupRankTxt}>{pos}</Text>
      </View>
      <View style={styles.coupNum}>
        <Text style={styles.coupNumTxt}>{h.numPmu}</Text>
      </View>
      <Text style={styles.coupName} numberOfLines={1}>
        {h.nom}
      </Text>
      {h.coteDirect != null ? <Text style={styles.coupCote}>{h.coteDirect}</Text> : null}
    </View>
  );
}

function CouplesView({ data }: { data: { analysis: any[]; aJouer: number[] } }) {
  // data.analysis est déjà trié par cote directe croissante (favoris en premier)
  // => position N = analysis[N-1].
  const ranked = data.analysis;
  const PAIRS: [number, number][] = [
    [1, 3],
    [1, 5],
    [1, 4],
    [2, 3],
    [2, 4],
    [2, 6],
  ];
  const combos = PAIRS.map(([a, b]) => ({ a, b, ha: ranked[a - 1], hb: ranked[b - 1] })).filter(
    (x) => x.ha && x.hb
  );

  if (!ranked.length) {
    return (
      <EmptyState
        icon="git-compare-outline"
        title="Couplés indisponibles"
        subtitle="Cotes non disponibles pour cette course."
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}>
      <View style={styles.coupHeaderCard}>
        <View style={styles.coupBadge}>
          <Text style={styles.coupBadgeTxt}>90%</Text>
        </View>
        <Text style={styles.coupHeaderTxt}>
          Couplés basés sur le classement des cotes (favoris en premier). Positions jouées : 1-3,
          1-5, 1-4, 2-3, 2-4, 2-6.
        </Text>
      </View>
      {combos.map(({ a, b, ha, hb }) => (
        <View key={`${a}-${b}`} testID={`couple-${a}-${b}`} style={styles.coupCard}>
          <View style={styles.coupPos}>
            <Text style={styles.coupPosTxt}>
              {a}-{b}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <CoupHorse pos={a} h={ha} />
            <View style={styles.coupDivider} />
            <CoupHorse pos={b} h={hb} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


function CotesView({ data }: { data: { analysis: any[]; aJouer: number[] } }) {
  const { analysis, aJouer } = data;
  if (!analysis || analysis.length === 0) {
    return (
      <EmptyState
        icon="trending-down-outline"
        title="Analyse des cotes indisponible"
        subtitle="Les cotes ne sont pas encore publiées pour cette course."
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}>
      <View style={styles.disclaimer}>
        <Ionicons name="pulse" size={14} color={T.color.brand} />
        <Text style={styles.disclaimerTxt}>Cote matin → cote directe → projection au départ</Text>
      </View>

      {aJouer.length > 0 ? (
        <View testID="cotes-ajouer" style={styles.ajouerCard}>
          <View style={styles.ajouerHead}>
            <Ionicons name="cash" size={16} color="#fff" />
            <Text style={styles.ajouerTitle}>Numéros à jouer</Text>
          </View>
          <Text style={styles.ajouerSub}>Cotes en baisse marquée + bon profil IA (l&apos;argent rentre)</Text>
          <View style={styles.ajouerNums}>
            {aJouer.map((n) => (
              <View key={n} testID={`ajouer-${n}`} style={styles.ajouerChip}>
                <Text style={styles.ajouerChipTxt}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {analysis.map((a) => {
        const sig = SIGNAL[a.signal] || SIGNAL.neutre;
        const c = cat(a.categorie);
        const up = a.direction === "hausse";
        const down = a.direction === "baisse";
        return (
          <View key={a.numPmu} testID={`cote-row-${a.numPmu}`} style={[styles.coteRow, { borderLeftColor: c.color }]}>
            <View style={[styles.coteNum, { backgroundColor: c.bg }]}>
              <Text style={[styles.coteNumTxt, { color: c.color }]}>{a.numPmu}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coteName} numberOfLines={1}>{a.nom}</Text>
              <View style={styles.coteEvo}>
                <Text style={styles.coteRef}>{a.coteReference != null ? a.coteReference.toFixed(1) : "—"}</Text>
                <Ionicons name="arrow-forward" size={12} color={T.color.muted} />
                <Text style={styles.coteDirect}>{a.coteDirect != null ? a.coteDirect.toFixed(1) : "—"}</Text>
                {a.variation != null ? (
                  <View style={[styles.varPill, { backgroundColor: down ? "#E6F4EC" : up ? "#FEE2E2" : "#F1F1F3" }]}>
                    <Ionicons
                      name={down ? "caret-down" : up ? "caret-up" : "remove"}
                      size={11}
                      color={down ? "#0A7A42" : up ? "#B91C1C" : "#6B7280"}
                    />
                    <Text style={[styles.varTxt, { color: down ? "#0A7A42" : up ? "#B91C1C" : "#6B7280" }]}>
                      {Math.abs(a.variation)}%
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.signalPill, { backgroundColor: sig.bg }]}>
                <Ionicons name={sig.icon} size={11} color={sig.color} />
                <Text style={[styles.signalTxt, { color: sig.color }]}>{sig.label}</Text>
              </View>
            </View>
            <View style={styles.cibleBox}>
              <Text style={styles.cibleVal}>{a.coteCible != null ? a.coteCible.toFixed(1) : "—"}</Text>
              <Text style={styles.cibleLbl}>cote cible</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.color.surface },
  header: { backgroundColor: T.color.brandDark, paddingHorizontal: T.space.lg, paddingBottom: T.space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: T.space.md },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headSub: { color: "rgba(255,255,255,0.8)", fontSize: T.font.sm, fontWeight: "600" },
  headTitle: { color: "#fff", fontSize: T.font.xl, fontWeight: "800" },
  metaRow: { flexDirection: "row", gap: 6, marginTop: T.space.sm, flexWrap: "wrap" },
  metaTxt: { color: "rgba(255,255,255,0.9)", fontSize: T.font.base, fontWeight: "600" },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: T.radius.md,
    padding: 4,
    marginTop: T.space.md,
  },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: T.radius.sm, alignItems: "center" },
  segBtnActive: { backgroundColor: "#fff" },
  segTxt: { color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: T.font.base },
  segTxtActive: { color: T.color.brandDark },

  sortRow: { flexDirection: "row", gap: T.space.sm, marginBottom: T.space.md },
  sortChip: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: T.radius.pill,
    backgroundColor: T.color.surfaceTertiary,
  },
  sortChipActive: { backgroundColor: T.color.brand },
  sortTxt: { fontWeight: "700", color: T.color.onSurfaceTertiary, fontSize: T.font.base },
  sortTxtActive: { color: "#fff" },

  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    ...T.shadow.card,
  },
  pNum: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: T.color.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
  },
  pNumTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.lg },
  finishBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radius.sm,
    backgroundColor: T.color.surfaceTertiary,
  },
  finishTxt: { fontSize: T.font.sm, fontWeight: "800", color: "#fff" },
  arriveeCard: {
    backgroundColor: T.color.surfaceInverse,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.md,
    ...T.shadow.card,
  },
  arriveeHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: T.space.sm },
  arriveeTitle: { color: "#fff", fontWeight: "800", fontSize: T.font.base },
  arriveeRow: { flexDirection: "row", alignItems: "center", gap: T.space.sm, paddingVertical: 5 },
  arriveePos: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  arriveePosTxt: { fontWeight: "800", fontSize: T.font.sm },
  arriveeNum: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  arriveeNumTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.sm },
  arriveeName: { flex: 1, color: "#fff", fontWeight: "600", fontSize: T.font.base },
  arriveeCote: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: T.font.sm },
  casaque: { width: 30, height: 30 },
  pName: { fontSize: T.font.lg, fontWeight: "700", color: T.color.onSurface },
  pMeta: { fontSize: T.font.sm, color: T.color.muted, marginTop: 1 },
  musique: { fontSize: T.font.sm, color: T.color.brand, marginTop: 3, fontWeight: "600", letterSpacing: 0.5 },
  pRight: { alignItems: "center" },

  disclaimer: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: T.space.md },
  disclaimerTxt: { color: T.color.muted, fontSize: T.font.sm, fontWeight: "600" },
  topCard: {
    backgroundColor: T.color.brand,
    borderRadius: T.radius.lg,
    padding: T.space.lg,
    marginBottom: T.space.lg,
    ...T.shadow.strong,
  },
  topRankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radius.pill,
    marginBottom: T.space.md,
  },
  topRankTxt: { color: "#fff", fontWeight: "700", fontSize: T.font.sm },
  topRow: { flexDirection: "row", alignItems: "center", gap: T.space.md },
  topNum: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNumTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.xxl },
  topName: { color: "#fff", fontWeight: "800", fontSize: T.font.xl },
  topDriver: { color: "rgba(255,255,255,0.85)", fontSize: T.font.base, marginTop: 2 },
  confBox: { alignItems: "center" },
  confVal: { color: "#fff", fontWeight: "800", fontSize: T.font.xxxl },
  confLbl: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600" },
  topReason: { color: "#fff", fontSize: T.font.base, marginTop: T.space.md, lineHeight: 20 },
  topCote: { color: "rgba(255,255,255,0.9)", fontSize: T.font.base, fontWeight: "700", marginTop: 6 },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.sm,
    ...T.shadow.card,
  },
  rankNum: { width: 20, textAlign: "center", fontSize: T.font.lg, fontWeight: "800", color: T.color.muted },
  rankHorseNum: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.color.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rankHorseNumTxt: { fontWeight: "800", color: T.color.onSurface },
  rankName: { fontSize: T.font.base, fontWeight: "700", color: T.color.onSurface },
  rankReason: { fontSize: T.font.sm, color: T.color.muted, marginTop: 1 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: T.color.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3, backgroundColor: T.color.brand },
  rankScoreBox: { alignItems: "flex-end", minWidth: 40 },
  rankScore: { fontSize: T.font.lg, fontWeight: "800", color: T.color.brand },
  rankCote: { fontSize: T.font.sm, color: T.color.muted, marginTop: 2 },

  rapportsCard: {
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.md,
    ...T.shadow.card,
  },
  rapportsHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: T.space.sm },
  rapportsTitle: { fontWeight: "800", fontSize: T.font.base, color: T.color.onSurface },
  rapportRow: {
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: T.color.border,
  },
  rapportType: { fontSize: T.font.sm, fontWeight: "700", color: T.color.muted, marginBottom: 6 },
  rapportVals: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rapportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.color.brandSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.sm,
  },
  rapportComb: { fontSize: T.font.sm, fontWeight: "700", color: T.color.brandDark },
  rapportDiv: { fontSize: T.font.base, fontWeight: "800", color: T.color.brand },

  bilanCard: {
    backgroundColor: T.color.surfaceInverse,
    borderRadius: T.radius.lg,
    padding: T.space.lg,
    marginBottom: T.space.lg,
    ...T.shadow.card,
  },
  bilanTitle: { color: "#fff", fontWeight: "800", fontSize: T.font.lg, marginBottom: T.space.md },
  bilanRow: { flexDirection: "row", alignItems: "center" },
  bilanItem: { flex: 1, alignItems: "center", gap: 4 },
  bilanDivider: { width: 0.5, height: 44, backgroundColor: "rgba(255,255,255,0.2)" },
  bilanVal: { color: "#fff", fontWeight: "800", fontSize: T.font.lg },
  bilanBig: { color: "#fff", fontWeight: "800", fontSize: T.font.xxl },
  bilanLbl: { color: "rgba(255,255,255,0.7)", fontSize: T.font.sm, textAlign: "center" },
  resultPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.md,
  },
  resultPillTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.xl },
  rankResultBadge: {
    minWidth: 40,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: T.radius.sm,
    backgroundColor: T.color.surfaceTertiary,
  },
  rankResultTxt: { fontWeight: "800", fontSize: T.font.base, color: T.color.onSurfaceTertiary },

  topResultCol: { alignItems: "center", gap: 6 },
  rankResultCol: { alignItems: "center", gap: 5, minWidth: 44 },
  ecartTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radius.pill,
  },
  ecartTxt: { fontSize: 10, fontWeight: "800" },

  lockGhost: { gap: T.space.sm, marginBottom: -140 },
  lockGhostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
  },
  lockGhostNum: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.color.surfaceTertiary },
  lockGhostBar: { height: 10, borderRadius: 5, backgroundColor: T.color.surfaceTertiary },
  lockGhostPill: { width: 44, height: 24, borderRadius: 12, backgroundColor: T.color.surfaceTertiary },
  lockCard: {
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.lg,
    padding: T.space.xl,
    alignItems: "center",
    gap: T.space.sm,
    marginTop: 80,
    ...T.shadow.strong,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  lockTitle: { fontSize: T.font.xl, fontWeight: "800", color: T.color.onSurface, textAlign: "center" },
  lockSub: { fontSize: T.font.base, color: T.color.muted, textAlign: "center", marginBottom: T.space.sm },
  watchAdBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDE68A",
    borderWidth: 1,
    borderColor: "#F5C518",
    borderRadius: T.radius.md,
    paddingVertical: 13,
    paddingHorizontal: T.space.lg,
    marginBottom: T.space.sm,
  },
  watchAdBtnTxt: { color: "#7A5200", fontWeight: "800", fontSize: T.font.sm, flexShrink: 1, textAlign: "center" },
  watchAdHint: { color: T.color.muted, fontSize: T.font.sm, textAlign: "center", marginBottom: T.space.sm },
  coupHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.brandSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.md,
  },
  coupBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  coupBadgeTxt: { color: T.color.onBrand, fontWeight: "900", fontSize: T.font.sm },
  coupHeaderTxt: { flex: 1, fontSize: T.font.sm, color: T.color.brandDark, fontWeight: "600", lineHeight: 18 },
  coupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.sm,
    ...T.shadow.card,
  },
  coupPos: {
    width: 52,
    height: 52,
    borderRadius: T.radius.md,
    backgroundColor: T.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  coupPosTxt: { color: T.color.onBrand, fontWeight: "900", fontSize: T.font.lg },
  coupDivider: { height: 1, backgroundColor: T.color.border, marginVertical: 8 },
  coupHorseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  coupRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.color.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  coupRankTxt: { fontSize: 11, fontWeight: "800", color: T.color.muted },
  coupNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.color.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  coupNumTxt: { fontSize: T.font.base, fontWeight: "800", color: T.color.brand },
  coupName: { flex: 1, fontSize: T.font.base, fontWeight: "700", color: T.color.onSurface },
  coupCote: { fontSize: T.font.base, fontWeight: "800", color: T.color.onSurface },
  lockBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.color.brand,
    borderRadius: T.radius.md,
    paddingVertical: 14,
    paddingHorizontal: T.space.xl,
  },
  lockBtnTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.base },

  tocardsBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginTop: T.space.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tocardsHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  tocardsTitle: { fontWeight: "800", fontSize: T.font.lg, color: "#92400E" },
  tocardsSub: { fontSize: T.font.sm, color: "#B45309", marginTop: 2, marginBottom: T.space.sm },
  tocardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.sm,
    padding: T.space.sm,
    marginTop: T.space.sm,
  },
  tocardNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.color.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  tocardNumTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.base },
  tocardName: { fontSize: T.font.base, fontWeight: "700", color: T.color.onSurface },
  tocardReason: { fontSize: T.font.sm, color: "#B45309", marginTop: 1 },
  tocardCote: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radius.sm,
  },
  tocardCoteTxt: { fontWeight: "800", fontSize: T.font.lg, color: "#B45309" },
  tocardResult: {
    minWidth: 40,
    alignItems: "center",
    backgroundColor: T.color.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: T.radius.sm,
  },
  tocardResultTxt: { fontWeight: "800", fontSize: T.font.base, color: T.color.onSurfaceTertiary },

  // Catégories / légende
  legendRow: { flexDirection: "row", gap: T.space.md, marginBottom: T.space.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: T.font.sm, color: T.color.muted, fontWeight: "600" },
  topBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: T.space.md },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.radius.pill },
  catPillTxt: { fontWeight: "800", fontSize: T.font.sm },

  // Analyse des cotes
  ajouerCard: {
    backgroundColor: T.color.brand,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.md,
    ...T.shadow.card,
  },
  ajouerHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  ajouerTitle: { color: "#fff", fontWeight: "800", fontSize: T.font.base },
  ajouerSub: { color: "rgba(255,255,255,0.9)", fontSize: T.font.sm, marginTop: 2, marginBottom: T.space.sm },
  ajouerNums: { flexDirection: "row", flexWrap: "wrap", gap: T.space.sm },
  ajouerChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  ajouerChipTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.lg },
  coteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    borderLeftWidth: 3,
    padding: T.space.md,
    marginBottom: T.space.sm,
    ...T.shadow.card,
  },
  coteNum: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  coteNumTxt: { fontWeight: "800", fontSize: T.font.lg },
  coteName: { fontSize: T.font.base, fontWeight: "700", color: T.color.onSurface },
  coteEvo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  coteRef: { fontSize: T.font.sm, color: T.color.muted, fontWeight: "600", textDecorationLine: "line-through" },
  coteDirect: { fontSize: T.font.base, color: T.color.onSurface, fontWeight: "800" },
  varPill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: T.radius.sm },
  varTxt: { fontSize: T.font.sm, fontWeight: "800" },
  signalPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: T.radius.pill, marginTop: 6 },
  signalTxt: { fontSize: T.font.sm, fontWeight: "700" },
  cibleBox: { alignItems: "center", minWidth: 52 },
  cibleVal: { fontSize: T.font.xl, fontWeight: "800", color: T.color.brandDark },
  cibleLbl: { fontSize: 10, color: T.color.muted, fontWeight: "600" },
});


################################################################################
