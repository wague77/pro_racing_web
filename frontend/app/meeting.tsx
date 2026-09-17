import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { T, IMAGES } from "@/src/theme";
import RaceCard from "@/src/components/RaceCard";
import { EmptyState } from "@/src/components/ui";
import { favorites, courseKey, FavCourse } from "@/src/favorites";

export default function Meeting() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; reunion: string }>();
  const date = params.date;
  const reunion = params.reunion ? JSON.parse(params.reunion) : null;
  const hippo = reunion?.hippodrome || {};
  const rNum = reunion?.numExterne || reunion?.numOfficiel;
  const [favKeys, setFavKeys] = useState<Set<string>>(new Set());

  const reloadFavs = useCallback(async () => {
    const arr = await favorites.getCourses();
    setFavKeys(new Set(arr.map((x) => x.key)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadFavs();
    }, [reloadFavs])
  );

  const toggleFav = async (course: any) => {
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
    await favorites.toggleCourse(item);
    reloadFavs();
  };

  const openCourse = (course: any) => {
    const cNum = course.numExterne || course.numOrdre;
    router.push({
      pathname: "/course",
      params: {
        date,
        r: String(rNum),
        c: String(cNum),
        libelle: course.libelle || course.libelleCourt || "",
        hippodrome: hippo.libelleCourt || hippo.libelleLong || "",
        discipline: course.specialite || course.discipline || "",
        distance: String(course.distance || ""),
        heureDepart: String(course.heureDepart || ""),
        segment: "partants",
      },
    } as any);
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={IMAGES.track} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={["rgba(28,28,30,0.3)", "rgba(28,28,30,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + T.space.sm }]}>
          <Pressable testID="back-button" hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.rPill}>
            <Text style={styles.rPillTxt}>R{rNum}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {hippo.libelleCourt || hippo.libelleLong || "Réunion"}
          </Text>
          <Text style={styles.heroSub}>
            {reunion?.courses?.length || 0} courses · {reunion?.pays || "France"}
          </Text>
        </View>
      </View>

      {!reunion || (reunion.courses || []).length === 0 ? (
        <EmptyState icon="flag-outline" title="Aucune course" subtitle="Programme indisponible." />
      ) : (
        <FlatList
          data={reunion.courses}
          keyExtractor={(c) => String(c.numExterne || c.numOrdre)}
          contentContainerStyle={{ padding: T.space.lg, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: T.space.md }} />}
          renderItem={({ item }) => {
            const cNum = item.numExterne || item.numOrdre;
            const key = courseKey(date, rNum, cNum);
            return (
              <RaceCard
                testID={`race-card-C${cNum}`}
                course={item}
                onPress={() => openCourse(item)}
                isFav={favKeys.has(key)}
                onToggleFav={() => toggleFav(item)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.color.surface },
  hero: { height: 210, backgroundColor: "#1C1C1E" },
  heroContent: { flex: 1, paddingHorizontal: T.space.lg, justifyContent: "flex-end", paddingBottom: T.space.lg },
  backBtn: {
    position: "absolute",
    left: T.space.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  rPill: {
    alignSelf: "flex-start",
    backgroundColor: T.color.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: T.radius.pill,
    marginBottom: T.space.sm,
  },
  rPillTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.base },
  heroTitle: { fontSize: T.font.xxl, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: T.font.base, color: "rgba(255,255,255,0.85)", marginTop: 4 },
});


################################################################################
