import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { T } from "@/src/theme";
import RaceCard from "@/src/components/RaceCard";
import { OddsBadge, EmptyState } from "@/src/components/ui";
import AdBanner from "@/src/ads/AdBanner";
import { favorites, FavHorse, FavCourse } from "@/src/favorites";

type Seg = "chevaux" | "courses";

export default function Favoris() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>("chevaux");
  const [horses, setHorses] = useState<FavHorse[]>([]);
  const [courses, setCourses] = useState<FavCourse[]>([]);

  const reload = useCallback(async () => {
    setHorses(await favorites.getHorses());
    setCourses(await favorites.getCourses());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const openHorse = (h: FavHorse) => {
    router.push({
      pathname: "/horse",
      params: {
        participant: JSON.stringify(h.participant),
        date: h.date,
        r: String(h.r),
        c: String(h.c),
        hippodrome: h.hippodrome || "",
      },
    } as any);
  };

  const openCourse = (cse: FavCourse) => {
    router.push({
      pathname: "/course",
      params: {
        date: cse.date,
        r: String(cse.r),
        c: String(cse.c),
        libelle: cse.libelle,
        hippodrome: cse.hippodrome || "",
        discipline: cse.discipline || "",
        distance: String(cse.distance || ""),
        heureDepart: String(cse.heureDepart || ""),
        segment: "partants",
      },
    } as any);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <Text style={styles.title}>Favoris</Text>
        <View style={styles.segment}>
          {(["chevaux", "courses"] as Seg[]).map((s) => (
            <Pressable
              key={s}
              testID={`fav-seg-${s}`}
              style={[styles.segBtn, seg === s && styles.segBtnActive]}
              onPress={() => setSeg(s)}
            >
              <Text style={[styles.segTxt, seg === s && styles.segTxtActive]}>
                {s === "chevaux" ? `Chevaux (${horses.length})` : `Courses (${courses.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {seg === "chevaux" ? (
        horses.length === 0 ? (
          <EmptyState
            testID="fav-horses-empty"
            icon="heart-outline"
            title="Aucun cheval favori"
            subtitle="Ajoutez des chevaux depuis le détail d'une course."
          />
        ) : (
          <FlatList
            data={horses}
            keyExtractor={(h) => h.key}
            contentContainerStyle={{ padding: T.space.lg, paddingBottom: 110 }}
            ItemSeparatorComponent={() => <View style={{ height: T.space.sm }} />}
            renderItem={({ item }) => (
              <Pressable testID={`fav-horse-${item.key}`} style={styles.hRow} onPress={() => openHorse(item)}>
                <View style={styles.hNum}>
                  <Text style={styles.hNumTxt}>{item.numPmu}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hName} numberOfLines={1}>
                    {item.nom}
                  </Text>
                  <Text style={styles.hMeta} numberOfLines={1}>
                    {item.hippodrome} · R{item.r}C{item.c}
                    {item.driver ? ` · ${item.driver}` : ""}
                  </Text>
                </View>
                <OddsBadge cote={item.cote} />
              </Pressable>
            )}
          />
        )
      ) : courses.length === 0 ? (
        <EmptyState
          testID="fav-courses-empty"
          icon="heart-outline"
          title="Aucune course favorite"
          subtitle="Ajoutez des courses depuis leur écran de détail."
        />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.key}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 110 }}
          ItemSeparatorComponent={() => <View style={{ height: T.space.md }} />}
          renderItem={({ item }) => (
            <RaceCard
              testID={`fav-course-${item.key}`}
              course={{
                numExterne: item.c,
                libelle: item.libelle,
                discipline: item.discipline,
                specialite: item.discipline,
                distance: item.distance,
                heureDepart: item.heureDepart,
              }}
              hippoLabel={`R${item.r} · ${item.hippodrome}`}
              onPress={() => openCourse(item)}
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
    paddingBottom: T.space.md,
  },
  title: { fontSize: T.font.xxl, fontWeight: "800", color: T.color.onSurface, paddingHorizontal: T.space.lg },
  segment: {
    flexDirection: "row",
    backgroundColor: T.color.surfaceTertiary,
    borderRadius: T.radius.md,
    padding: 4,
    marginHorizontal: T.space.lg,
    marginTop: T.space.md,
  },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: T.radius.sm, alignItems: "center" },
  segBtnActive: { backgroundColor: T.color.surfaceSecondary, ...T.shadow.card },
  segTxt: { fontWeight: "700", color: T.color.muted, fontSize: T.font.base },
  segTxtActive: { color: T.color.brand },
  hRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    ...T.shadow.card,
  },
  hNum: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.color.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
  },
  hNumTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.lg },
  hName: { fontSize: T.font.lg, fontWeight: "700", color: T.color.onSurface },
  hMeta: { fontSize: T.font.sm, color: T.color.muted, marginTop: 2 },
});


################################################################################
