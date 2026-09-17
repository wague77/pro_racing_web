import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { apiDate, isQuintePlus } from "@/src/lib/format";
import DatePicker from "@/src/components/DatePicker";
import DateModal from "@/src/components/DateModal";
import { EmptyState, Loader } from "@/src/components/ui";
import AdBanner from "@/src/ads/AdBanner";

function MeetingCard({ reunion, onPress }: { reunion: any; onPress: () => void }) {
  const hippo = reunion.hippodrome || {};
  const nb = reunion.courses?.length || 0;
  const hasQuinte = Array.isArray(reunion.courses) && reunion.courses.some(isQuintePlus);
  return (
    <Pressable testID={`meeting-card-R${reunion.numOfficiel}`} style={styles.card} onPress={onPress}>
      <View style={styles.rBadge}>
        <Text style={styles.rBadgeTxt}>R{reunion.numExterne || reunion.numOfficiel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.hippoRow}>
          <Text style={styles.hippo} numberOfLines={1}>
            {hippo.libelleCourt || hippo.libelleLong || "Réunion"}
          </Text>
          {hasQuinte ? (
            <View style={styles.quinteChip}>
              <Ionicons name="star" size={11} color="#7A5200" />
              <Text style={styles.quinteChipTxt}>QUINTÉ+</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>
          {nb} course{nb > 1 ? "s" : ""}
          {reunion.pays ? ` · ${reunion.pays}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={T.color.muted} />
    </Pressable>
  );
}

export default function Reunions() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [date, setDate] = useState(dayjs().startOf("day"));
  const [showDateModal, setShowDateModal] = useState(false);
  const [reunions, setReunions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await api.programme(apiDate(date), token);
        setReunions(res.reunions || []);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date, token]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Réunions</Text>
            <Text style={styles.subtitle}>{date.format("dddd D MMMM YYYY")}</Text>
          </View>
          <Pressable
            testID="open-date-modal"
            onPress={() => setShowDateModal(true)}
            style={styles.calBtn}
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={20} color={T.color.brand} />
            <Text style={styles.calBtnTxt}>Date</Text>
          </Pressable>
        </View>
        <DatePicker selected={date} onSelect={setDate} />
      </View>

      <DateModal
        visible={showDateModal}
        initialDate={date}
        onClose={() => setShowDateModal(false)}
        onConfirm={(d) => setDate(d)}
      />

      {loading ? (
        <Loader label="Chargement du programme..." />
      ) : error ? (
        <EmptyState
          testID="reunions-error"
          icon="cloud-offline-outline"
          title="Impossible de charger"
          subtitle={error}
          onRetry={() => load()}
        />
      ) : reunions.length === 0 ? (
        <EmptyState
          testID="reunions-empty"
          icon="calendar-outline"
          title="Aucune réunion"
          subtitle="Aucune réunion prévue à cette date."
        />
      ) : (
        <FlatList
          data={reunions}
          keyExtractor={(r) => String(r.numOfficiel)}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 110 }}
          ItemSeparatorComponent={() => <View style={{ height: T.space.md }} />}
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
          renderItem={({ item }) => (
            <MeetingCard
              reunion={item}
              onPress={() =>
                router.push({
                  pathname: "/meeting",
                  params: {
                    date: apiDate(date),
                    reunion: JSON.stringify(item),
                  },
                } as any)
              }
            />
          )}
        />
      )}
      <AdBanner />
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
  title: { fontSize: T.font.xxl, fontWeight: "800", color: T.color.onSurface },
  subtitle: {
    fontSize: T.font.base,
    color: T.color.muted,
    marginTop: 2,
    marginBottom: T.space.sm,
    textTransform: "capitalize",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: T.space.lg,
  },
  calBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.color.brandSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: T.radius.md,
    marginTop: 2,
  },
  calBtnTxt: { fontSize: T.font.base, fontWeight: "700", color: T.color.brand },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    ...T.shadow.card,
  },
  rBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: T.color.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rBadgeTxt: { fontSize: T.font.lg, fontWeight: "800", color: T.color.brand },
  hippo: { fontSize: T.font.lg, fontWeight: "700", color: T.color.onSurface, flexShrink: 1 },
  hippoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  quinteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: T.radius.sm,
  },
  quinteChipTxt: { fontSize: 9, fontWeight: "900", color: "#7A5200", letterSpacing: 0.4 },
  meta: { fontSize: T.font.base, color: T.color.muted, marginTop: 3 },
});


################################################################################
