import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { T } from "@/src/theme";
import { fmtGains, sexeLabel } from "@/src/lib/format";
import { favorites, horseKey, FavHorse } from "@/src/favorites";

function musiqueChips(musique?: string | null) {
  if (!musique) return [];
  const tokens = musique.match(/(\d{1,2}|[DTARN])([ampts])|\(\d{2}\)/g) || [];
  return tokens.map((t) => {
    if (t.startsWith("(")) return { txt: t, tone: "year" as const };
    const pos = t.match(/^\d+/)?.[0];
    if (!pos) return { txt: t, tone: "bad" as const };
    const n = parseInt(pos, 10);
    if (n === 1) return { txt: t, tone: "win" as const };
    if (n <= 3) return { txt: t, tone: "place" as const };
    return { txt: t, tone: "neutral" as const };
  });
}

export default function Horse() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const p = useLocalSearchParams<{
    participant: string;
    date: string;
    r: string;
    c: string;
    hippodrome: string;
  }>();
  const part = p.participant ? JSON.parse(p.participant) : {};
  const key = horseKey(p.date, Number(p.r), Number(p.c), part.numPmu);
  const [fav, setFav] = useState(false);

  useFocusEffect(
    useCallback(() => {
      favorites.isHorse(key).then(setFav);
    }, [key])
  );

  const toggleFav = async () => {
    const item: FavHorse = {
      key,
      numPmu: part.numPmu,
      nom: part.nom,
      driver: part.driver,
      cote: part.cote,
      musique: part.musique,
      date: p.date,
      r: Number(p.r),
      c: Number(p.c),
      hippodrome: p.hippodrome,
      participant: part,
    };
    setFav(await favorites.toggleHorse(item));
  };

  const chips = musiqueChips(part.musique);
  const stats = [
    { label: "Courses", value: part.nombreCourses ?? "—", icon: "flag" },
    { label: "Victoires", value: part.nombreVictoires ?? "—", icon: "trophy" },
    { label: "Places", value: part.nombrePlaces ?? "—", icon: "podium" },
    { label: "Gains", value: fmtGains(part.gainsCarriere), icon: "cash" },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <View style={styles.headRow}>
          {part.urlCasaque ? (
            <Image source={part.urlCasaque} style={styles.casaque} contentFit="contain" />
          ) : (
            <View style={styles.numCircle}>
              <Text style={styles.numCircleTxt}>{part.numPmu}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{part.nom}</Text>
            <Text style={styles.sub}>
              N°{part.numPmu} · {part.age} ans · {sexeLabel(part.sexe)}
            </Text>
          </View>
          <Pressable testID="horse-fav-button" hitSlop={10} onPress={toggleFav} style={styles.favBtn}>
            <Ionicons name={fav ? "heart" : "heart-outline"} size={24} color={fav ? T.color.error : "#fff"} />
          </Pressable>
          <Pressable testID="close-horse" hitSlop={10} onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: insets.bottom + 30 }}>
        {/* Odds */}
        <View style={styles.oddsCard}>
          <Text style={styles.oddsLabel}>Cote actuelle</Text>
          <Text style={styles.oddsVal}>{part.cote != null ? part.cote.toFixed(1) : "—"}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard} testID={`stat-${s.label}`}>
              <Ionicons name={s.icon as any} size={18} color={T.color.brand} />
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Musique / forme */}
        {chips.length > 0 ? (
          <Section title="Forme récente (musique)">
            <View style={styles.chipWrap}>
              {chips.map((ch, i) => (
                <View
                  key={i}
                  style={[
                    styles.mChip,
                    ch.tone === "win" && { backgroundColor: T.color.brand },
                    ch.tone === "place" && { backgroundColor: T.color.brandSecondary },
                    ch.tone === "bad" && { backgroundColor: "#FEE2E2" },
                    ch.tone === "year" && { backgroundColor: "transparent" },
                  ]}
                >
                  <Text
                    style={[
                      styles.mChipTxt,
                      ch.tone === "win" && { color: "#fff" },
                      ch.tone === "place" && { color: T.color.brand },
                      ch.tone === "bad" && { color: T.color.error },
                      ch.tone === "year" && { color: T.color.muted },
                    ]}
                  >
                    {ch.txt}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Career details */}
        <Section title="Carrière & détails">
          <Detail label="Gains carrière" value={fmtGains(part.gainsCarriere)} />
          <Detail label="Gains victoires" value={fmtGains(part.gainsVictoires)} />
          <Detail label="Gains année en cours" value={fmtGains(part.gainsAnneeEnCours)} />
          <Detail label="2èmes / 3èmes" value={`${part.nombrePlacesSecond ?? 0} / ${part.nombrePlacesTroisieme ?? 0}`} />
          <Detail label="Driver / Jockey" value={part.driver || "—"} />
          <Detail label="Entraîneur" value={part.entraineur || "—"} />
          <Detail label="Propriétaire" value={part.proprietaire || "—"} />
          <Detail label="Père" value={part.nomPere || "—"} />
          <Detail label="Mère" value={part.nomMere || "—"} />
          {part.handicapPoids ? <Detail label="Poids" value={`${part.handicapPoids / 10} kg`} /> : null}
        </Section>

        {part.commentaire ? (
          <Section title="Commentaire dernière course">
            <Text style={styles.comment}>{part.commentaire}</Text>
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.color.surface },
  header: { backgroundColor: T.color.brandDark, paddingHorizontal: T.space.lg, paddingBottom: T.space.lg },
  headRow: { flexDirection: "row", alignItems: "center", gap: T.space.md },
  casaque: { width: 44, height: 44, backgroundColor: "#fff", borderRadius: 8 },
  numCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  numCircleTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.xl },
  name: { color: "#fff", fontSize: T.font.xl, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: T.font.base, marginTop: 2 },
  favBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  oddsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.color.brandSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    marginBottom: T.space.lg,
  },
  oddsLabel: { fontSize: T.font.base, fontWeight: "600", color: T.color.brand },
  oddsVal: { fontSize: T.font.xxxl, fontWeight: "800", color: T.color.brand },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: T.space.md, marginBottom: T.space.md },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    alignItems: "flex-start",
    gap: 4,
    ...T.shadow.card,
  },
  statVal: { fontSize: T.font.xl, fontWeight: "800", color: T.color.onSurface },
  statLbl: { fontSize: T.font.sm, color: T.color.muted },
  section: { marginTop: T.space.lg },
  sectionTitle: { fontSize: T.font.base, fontWeight: "800", color: T.color.onSurface, marginBottom: T.space.sm },
  sectionBody: {
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    ...T.shadow.card,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  mChip: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: T.color.surfaceTertiary,
    alignItems: "center",
  },
  mChipTxt: { fontWeight: "800", fontSize: T.font.base, color: T.color.onSurface },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: T.color.border,
    gap: T.space.md,
  },
  detailLabel: { fontSize: T.font.base, color: T.color.muted },
  detailValue: { fontSize: T.font.base, fontWeight: "600", color: T.color.onSurface, flexShrink: 1, textAlign: "right" },
  comment: { fontSize: T.font.base, color: T.color.onSurfaceTertiary, lineHeight: 21, fontStyle: "italic" },
});


################################################################################
