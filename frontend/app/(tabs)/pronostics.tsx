import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { apiDate } from "@/src/lib/format";
import DatePicker from "@/src/components/DatePicker";
import RaceCard from "@/src/components/RaceCard";
import { useInterstitial } from "@/src/ads/useInterstitial";
import { EmptyState, Loader } from "@/src/components/ui";

export default function Pronostics() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, isDemo } = useAuth();
  const { maybeShow } = useInterstitial();
  const [date, setDate] = useState(dayjs().startOf("day"));
  const [reunions, setReunions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => {
    if (token) api.performance(token).then(setPerf).catch(() => {});
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

  const open = (item: any) => {
    const cNum = item.numExterne || item.numOrdre;
    maybeShow();
    router.push({
      pathname: "/course",
      params: {
        date: apiDate(date),
        r: String(item._r),
        c: String(cNum),
        libelle: item.libelle || item.libelleCourt || "",
        hippodrome: item._hippo || "",
        discipline: item.specialite || item.discipline || "",
        distance: String(item.distance || ""),
        heureDepart: String(item.heureDepart || ""),
        segment: "pronostic",
      },
    } as any);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <Text style={styles.title}>Pronostics</Text>
        <Text style={styles.subtitle}>Top 8 IA · sélectionnez une course</Text>
        <Pressable
          testID="perf-banner"
          style={styles.perfBanner}
          onPress={() => router.push((isDemo ? "/paywall" : "/performance") as any)}
        >
          <View style={styles.perfIcon}>
            <Ionicons name={isDemo ? "lock-closed" : "stats-chart"} size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.perfTitle}>Performance IA · Quinté+</Text>
            <Text style={styles.perfSub}>
              {isDemo
                ? "Verrouillé · Débloquer l'accès complet"
                : perf && perf.races
                ? `${perf.winRate}% gagnants · ${perf.placeRate}% placés (${perf.days}j)`
                : "Fiabilité sur la course du Quinté+"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.color.muted} />
        </Pressable>
        <DatePicker selected={date} onSelect={setDate} />
      </View>

      {loading ? (
        <Loader label="Chargement des courses..." />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Erreur" subtitle={error} onRetry={load} />
      ) : flat.length === 0 ? (
        <EmptyState icon="trophy-outline" title="Aucune course" subtitle="Aucune course à cette date." />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c, i) => `R${c._r}C${c.numExterne || c.numOrdre}-${i}`}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 110 }}
          ItemSeparatorComponent={() => <View style={{ height: T.space.md }} />}
          ListHeaderComponent={
            isDemo ? (
              <Pressable testID="demo-banner" style={styles.demoBanner} onPress={() => router.push("/paywall" as any)}>
                <Ionicons name="play-circle" size={18} color={T.color.brandDark} />
                <Text style={styles.demoBannerTxt}>Mode démo · 3 courses. Touchez pour débloquer tout.</Text>
                <Ionicons name="lock-open" size={16} color={T.color.brandDark} />
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <RaceCard
              testID={`prono-course-R${item._r}C${item.numExterne || item.numOrdre}`}
              course={item}
              hippoLabel={`R${item._r} · ${item._hippo}`}
              onPress={() => open(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.color.surface },
  header: {
    backgroundColor: T.color.surfaceSecondary,
    borderBottomWidth: 0.5,
    borderBottomColor: T.color.border,
    paddingBottom: T.space.sm,
  },
  title: { fontSize: T.font.xxl, fontWeight: "800", color: T.color.onSurface, paddingHorizontal: T.space.lg },
  subtitle: {
    fontSize: T.font.base,
    color: T.color.muted,
    paddingHorizontal: T.space.lg,
    marginTop: 2,
    marginBottom: T.space.sm,
  },
  perfBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    marginHorizontal: T.space.lg,
    marginBottom: T.space.sm,
    padding: T.space.md,
    borderRadius: T.radius.md,
    backgroundColor: T.color.brandSecondary,
  },
  perfIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  perfTitle: { fontSize: T.font.base, fontWeight: "800", color: T.color.brandDark },
  perfSub: { fontSize: T.font.sm, color: T.color.brand, marginTop: 1, fontWeight: "600" },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.sm,
    backgroundColor: "#FEF3C7",
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: T.space.md,
    marginBottom: T.space.md,
  },
  demoBannerTxt: { flex: 1, fontSize: T.font.sm, fontWeight: "700", color: T.color.brandDark },
});


################################################################################
