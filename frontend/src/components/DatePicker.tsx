import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { dateLabel } from "@/src/lib/format";

export default function DatePicker({
  selected,
  onSelect,
}: {
  selected: dayjs.Dayjs;
  onSelect: (d: dayjs.Dayjs) => void;
}) {
  const days: dayjs.Dayjs[] = [];
  for (let i = -3; i <= 7; i++) days.push(dayjs().startOf("day").add(i, "day"));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((d) => {
        const active = d.isSame(selected, "day");
        return (
          <Pressable
            key={d.format("DDMMYYYY")}
            testID={`date-${d.format("DDMMYYYY")}`}
            onPress={() => onSelect(d)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{dateLabel(d)}</Text>
            <Text style={[styles.num, active && styles.numActive]}>{d.format("DD/MM")}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: T.space.sm, paddingHorizontal: T.space.lg, paddingVertical: T.space.sm },
  chip: {
    flexShrink: 0,
    minWidth: 62,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.color.surfaceTertiary,
  },
  chipActive: { backgroundColor: T.color.brand },
  label: { fontSize: T.font.sm, fontWeight: "600", color: T.color.onSurfaceTertiary, textTransform: "capitalize" },
  labelActive: { color: T.color.onBrand },
  num: { fontSize: T.font.base, fontWeight: "800", color: T.color.onSurface, marginTop: 2 },
  numActive: { color: T.color.onBrand },
});


################################################################################
