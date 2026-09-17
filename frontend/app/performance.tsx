import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Loader } from "@/src/components/ui";
import AdBanner from "@/src/ads/AdBanner";

export default function Performance() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<any>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const res = await api.performance(token);
        setData(res);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-poll while backend is still computing.
  useEffect(() => {
    if (data?.computing) {
      pollRef.current = setTimeout(() => load(true), 5000);
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [data, load]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <View style={styles.headRow}>
          <Pressable testID="back-button" hitSlop={12} onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headTitle}>Performance IA</Text>
            <Text style={styles.headSub}>
              {data?.days
                ? `Course du Quinté+ · ${data.days} derniers jours`
                : "Course du Quinté+"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <Loader label="Analyse des résultats..." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}
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
        >
          {data?.computing ? (
            <View testID="computing-banner" style={styles.computing}>
              <Ionicons name="sync" size={14} color={T.color.brand} />
              <Text style={styles.computingTxt}>
                Analyse en cours… {data.processed} courses traitées
              </Text>
            </View>
          ) : null}

          {/* Hero rates */}
          <View style={styles.heroRow}>
            <View style={[styles.heroCard, { backgroundColor: T.color.brand }]}>
              <Text style={styles.heroVal}>{data?.winRate ?? 0}%</Text>
              <Text style={styles.heroLbl}>Favoris gagnants</Text>
            </View>
            <View style={[styles.heroCard, { backgroundColor: T.color.brandDark }]}>
              <Text style={styles.heroVal}>{data?.placeRate ?? 0}%</Text>
              <Text style={styles.heroLbl}>Favoris placés (top 3)</Text>
            </View>
          </View>

          {/* Stat grid */}
          <View style={styles.grid}>
            <StatCard icon="flag" value={data?.races ?? 0} label="Quintés analysés" />
            <StatCard icon="trophy" value={data?.favWon ?? 0} label="Favori gagnant" />
            <StatCard icon="ribbon" value={data?.favPlaced ?? 0} label="Favori placé" />
            <StatCard icon="grid" value={`${data?.quinteAvg ?? 0}/5`} label="Quinté IA moyen" />
          </View>

          {/* Per-day */}
          {data?.byDay?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Détail par jour</Text>
              <View style={styles.sectionBody}>
                {data.byDay.map((d: any) => {
                  const label = dayjs(
                    `${d.date.slice(4, 8)}-${d.date.slice(2, 4)}-${d.date.slice(0, 2)}`
                  ).format("ddd D MMM");
                  const outcome = d.won ? "Gagné" : d.placed ? "Placé" : "Manqué";
                  const tone =
                    d.won ? T.color.brand : d.placed ? T.color.warning : T.color.muted;
                  return (
                    <View key={d.date} style={styles.dayRow}>
                      <Text style={styles.dayLabel}>{label}</Text>
                      <Text style={styles.dayHippo} numberOfLines={1}>
                        {d.hippodrome || "—"}
                      </Text>
                      <View style={[styles.outcomePill, { backgroundColor: tone }]}>
                        <Text style={styles.outcomeTxt}>{outcome}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Methodology */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Méthodologie</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.methodTxt}>
                {"Seule la course support du Quinté+ de chaque jour est analysée. Elle est rejouée par l'algorithme (analyse pondérée : cote, forme, gains, victoires, places), puis le favori IA est comparé à l'arrivée officielle. La période est configurable par l'administrateur (7 jours à 1 an)."}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
      <AdBanner />
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={T.color.brand} />
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
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
  headTitle: { color: "#fff", fontSize: T.font.xl, fontWeight: "800" },
  headSub: { color: "rgba(255,255,255,0.85)", fontSize: T.font.sm, marginTop: 2 },
  computing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.color.brandSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.md,
  },
  computingTxt: { color: T.color.brand, fontWeight: "600", fontSize: T.font.sm },
  heroRow: { flexDirection: "row", gap: T.space.md },
  heroCard: { flex: 1, borderRadius: T.radius.lg, padding: T.space.lg, ...T.shadow.card },
  heroVal: { color: "#fff", fontSize: T.font.xxxl, fontWeight: "800" },
  heroLbl: { color: "rgba(255,255,255,0.85)", fontSize: T.font.sm, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: T.space.md, marginTop: T.space.md },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
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
  dayRow: { flexDirection: "row", alignItems: "center", gap: T.space.md, paddingVertical: 8 },
  dayLabel: { width: 82, fontSize: T.font.sm, color: T.color.onSurfaceTertiary, textTransform: "capitalize" },
  dayHippo: { flex: 1, fontSize: T.font.sm, color: T.color.muted },
  outcomePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.radius.pill },
  outcomeTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.sm },
  methodTxt: { fontSize: T.font.base, color: T.color.onSurfaceTertiary, lineHeight: 21 },
});


################################################################################
