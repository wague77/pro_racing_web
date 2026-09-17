import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import dayjs from "dayjs";
import { T } from "@/src/theme";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Nombre d'années disponibles en arrière (~10 ans demandés, on prévoit large).
const YEARS_BACK = 15;

export default function DateModal({
  visible,
  initialDate,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialDate: dayjs.Dayjs;
  onClose: () => void;
  onConfirm: (d: dayjs.Dayjs) => void;
}) {
  const today = dayjs().startOf("day");
  const [year, setYear] = useState(initialDate.year());
  const [month, setMonth] = useState(initialDate.month());
  const [day, setDay] = useState(initialDate.date());

  useEffect(() => {
    if (visible) {
      setYear(initialDate.year());
      setMonth(initialDate.month());
      setDay(initialDate.date());
    }
  }, [visible, initialDate]);

  const years = useMemo(() => {
    const arr: number[] = [];
    // De l'année suivante (pour les programmes à venir) jusqu'à YEARS_BACK ans en arrière.
    for (let y = today.year() + 1; y >= today.year() - YEARS_BACK; y--) arr.push(y);
    return arr;
  }, [today]);

  const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth();
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Corrige le jour si le mois/année change et rend le jour invalide (ex: 31 -> 30).
  const safeDay = Math.min(day, daysInMonth);
  const selected = dayjs(new Date(year, month, safeDay)).startOf("day");

  const confirm = () => {
    onConfirm(selected);
    onClose();
  };

  const setToday = () => {
    setYear(today.year());
    setMonth(today.month());
    setDay(today.date());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choisir une date</Text>
          <Text style={styles.selectedTxt}>{selected.format("dddd D MMMM YYYY")}</Text>

          <View style={styles.columns}>
            {/* Jour */}
            <View style={styles.col}>
              <Text style={styles.colHead}>Jour</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    testID={`dm-day-${d}`}
                    onPress={() => setDay(d)}
                    style={[styles.item, d === safeDay && styles.itemActive]}
                  >
                    <Text style={[styles.itemTxt, d === safeDay && styles.itemTxtActive]}>{d}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Mois */}
            <View style={[styles.col, { flex: 1.5 }]}>
              <Text style={styles.colHead}>Mois</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
                {MONTHS.map((m, i) => (
                  <Pressable
                    key={m}
                    testID={`dm-month-${i}`}
                    onPress={() => setMonth(i)}
                    style={[styles.item, i === month && styles.itemActive]}
                  >
                    <Text style={[styles.itemTxt, i === month && styles.itemTxtActive]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Année */}
            <View style={styles.col}>
              <Text style={styles.colHead}>Année</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    testID={`dm-year-${y}`}
                    onPress={() => setYear(y)}
                    style={[styles.item, y === year && styles.itemActive]}
                  >
                    <Text style={[styles.itemTxt, y === year && styles.itemTxtActive]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable testID="dm-today" onPress={setToday} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostTxt}>{"Aujourd'hui"}</Text>
            </Pressable>
            <Pressable testID="dm-confirm" onPress={confirm} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryTxt}>Valider</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: T.space.lg,
    paddingTop: T.space.sm,
    paddingBottom: T.space.xl,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.color.border,
    marginBottom: T.space.md,
  },
  title: { fontSize: T.font.xl, fontWeight: "800", color: T.color.onSurface, textAlign: "center" },
  selectedTxt: {
    fontSize: T.font.base,
    color: T.color.brand,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
    marginBottom: T.space.md,
    textTransform: "capitalize",
  },
  columns: { flexDirection: "row", gap: T.space.sm, height: 240 },
  col: { flex: 1, backgroundColor: T.color.surfaceTertiary, borderRadius: T.radius.md, overflow: "hidden" },
  colHead: {
    fontSize: T.font.sm,
    fontWeight: "700",
    color: T.color.muted,
    textAlign: "center",
    paddingVertical: 6,
    textTransform: "uppercase",
  },
  colScroll: { flex: 1 },
  item: { paddingVertical: 10, alignItems: "center", marginHorizontal: 6, borderRadius: T.radius.sm },
  itemActive: { backgroundColor: T.color.brand },
  itemTxt: { fontSize: T.font.base, fontWeight: "600", color: T.color.onSurface },
  itemTxtActive: { color: T.color.onBrand, fontWeight: "800" },
  actions: { flexDirection: "row", gap: T.space.md, marginTop: T.space.lg },
  btn: { flex: 1, paddingVertical: 14, borderRadius: T.radius.md, alignItems: "center" },
  btnGhost: { backgroundColor: T.color.surfaceTertiary },
  btnGhostTxt: { fontSize: T.font.base, fontWeight: "700", color: T.color.onSurface },
  btnPrimary: { backgroundColor: T.color.brand },
  btnPrimaryTxt: { fontSize: T.font.base, fontWeight: "800", color: T.color.onBrand },
});


################################################################################
