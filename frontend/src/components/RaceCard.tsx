import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import { fmtHeure, fmtDistance, disciplineLabel, isQuintePlus } from "@/src/lib/format";
import { Tag } from "@/src/components/ui";

export default function RaceCard({
  course,
  hippoLabel,
  onPress,
  isFav,
  onToggleFav,
  testID,
}: {
  course: any;
  hippoLabel?: string;
  onPress: () => void;
  isFav?: boolean;
  onToggleFav?: () => void;
  testID?: string;
}) {
  const num = course.numExterne || course.numOrdre;
  const quinte = isQuintePlus(course);
  return (
    <Pressable testID={testID} style={[styles.card, quinte && styles.cardQuinte]} onPress={onPress}>
      <View style={[styles.cNum, quinte && styles.cNumQuinte]}>
        <Text style={styles.cNumTxt}>C{num}</Text>
        {course.heureDepart ? <Text style={styles.time}>{fmtHeure(course.heureDepart)}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        {hippoLabel ? <Text style={styles.hippo}>{hippoLabel}</Text> : null}
        {quinte ? (
          <View testID={`${testID}-quinte`} style={styles.quinteBadge}>
            <Ionicons name="star" size={12} color="#7A5200" />
            <Text style={styles.quinteBadgeTxt}>QUINTÉ+</Text>
          </View>
        ) : null}
        <Text style={styles.name} numberOfLines={1}>
          {course.libelle || course.libelleCourt}
        </Text>
        <View style={styles.tags}>
          <Tag text={disciplineLabel(course.discipline, course.specialite)} tone="brand" />
          {course.distance ? <Tag text={fmtDistance(course.distance)} /> : null}
          {course.nombreDeclaresPartants ? (
            <Tag text={`${course.nombreDeclaresPartants} partants`} />
          ) : null}
          {course.arriveeDefinitive ? <Tag text="Arrivée" tone="warn" /> : null}
        </View>
      </View>
      {onToggleFav ? (
        <Pressable testID={`${testID}-fav`} hitSlop={10} onPress={onToggleFav} style={styles.favBtn}>
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={22}
            color={isFav ? T.color.error : T.color.muted}
          />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={T.color.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.md,
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.md,
    ...T.shadow.card,
  },
  cardQuinte: {
    borderWidth: 1.5,
    borderColor: "#F5C518",
  },
  cNum: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.color.surfaceTertiary,
  },
  cNumQuinte: { backgroundColor: "#FFF7DC" },
  quinteBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: T.radius.sm,
    marginBottom: 4,
  },
  quinteBadgeTxt: { fontSize: 10, fontWeight: "900", color: "#7A5200", letterSpacing: 0.5 },
  cNumTxt: { fontSize: T.font.lg, fontWeight: "800", color: T.color.onSurface },
  time: { fontSize: T.font.sm, fontWeight: "600", color: T.color.brand, marginTop: 2 },
  hippo: { fontSize: T.font.sm, fontWeight: "600", color: T.color.muted, marginBottom: 2 },
  name: { fontSize: T.font.lg, fontWeight: "700", color: T.color.onSurface },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  favBtn: { padding: 4 },
});


################################################################################
