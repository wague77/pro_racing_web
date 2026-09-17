import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";

export function OddsBadge({ cote, tendance }: { cote?: number | null; tendance?: string | null }) {
  const val = cote != null ? cote.toFixed(1) : "—";
  let bg = T.color.surfaceTertiary;
  let fg = T.color.onSurfaceTertiary;
  if (cote != null) {
    if (cote < 5) {
      bg = T.color.brandSecondary;
      fg = T.color.brand;
    } else if (cote < 12) {
      bg = "#FEF3C7";
      fg = "#B45309";
    }
  }
  return (
    <View testID="odds-badge" style={[styles.badge, { backgroundColor: bg }]}>
      {tendance === "+" ? (
        <Ionicons name="arrow-up" size={11} color={fg} />
      ) : tendance === "-" ? (
        <Ionicons name="arrow-down" size={11} color={fg} />
      ) : null}
      <Text style={[styles.badgeTxt, { color: fg }]}>{val}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "sad-outline",
  title,
  subtitle,
  onRetry,
  testID,
}: {
  icon?: any;
  title: string;
  subtitle?: string;
  onRetry?: () => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={T.color.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {onRetry ? (
        <Pressable testID="retry-button" style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={T.color.onBrand} />
          <Text style={styles.retryTxt}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={T.color.brand} size="large" />
      {label ? <Text style={styles.loaderTxt}>{label}</Text> : null}
    </View>
  );
}

export function Tag({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "brand" | "warn" }) {
  const map = {
    neutral: { bg: T.color.surfaceTertiary, fg: T.color.onSurfaceTertiary },
    brand: { bg: T.color.brandSecondary, fg: T.color.brand },
    warn: { bg: "#FEF3C7", fg: "#B45309" },
  } as const;
  const c = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagTxt, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 52,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radius.md,
  },
  badgeTxt: { fontSize: T.font.lg, fontWeight: "800" },
  empty: { alignItems: "center", justifyContent: "center", padding: T.space.xl, paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.color.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.space.lg,
  },
  emptyTitle: { fontSize: T.font.lg, fontWeight: "700", color: T.color.onSurface, textAlign: "center" },
  emptySub: {
    fontSize: T.font.base,
    color: T.color.muted,
    textAlign: "center",
    marginTop: T.space.sm,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.color.brand,
    paddingHorizontal: T.space.lg,
    paddingVertical: T.space.md,
    borderRadius: T.radius.pill,
    marginTop: T.space.lg,
  },
  retryTxt: { color: T.color.onBrand, fontWeight: "700", fontSize: T.font.base },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", padding: T.space.xl, gap: T.space.md },
  loaderTxt: { color: T.color.muted, fontSize: T.font.base },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: T.radius.sm },
  tagTxt: { fontSize: T.font.sm, fontWeight: "600" },
});


################################################################################
