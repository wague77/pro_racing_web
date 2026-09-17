import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { T } from "@/src/theme";
import { s } from "./styles";

export function PerfConfig({
  perfDays,
  busy,
  onUpdate,
}: {
  perfDays: number | null;
  busy: boolean;
  onUpdate: (days: number) => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>PERFORMANCE IA · QUINTÉ+ (PÉRIODE)</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>{"Période d'analyse"}</Text>
        <Text style={s.cardSub}>
          {perfDays ? `Actuellement : ${perfDays} jours` : "Choisissez la période du bilan Quinté+."}
        </Text>
        <View style={s.durRow}>
          {[
            { label: "7 j", d: 7 },
            { label: "30 j", d: 30 },
            { label: "90 j", d: 90 },
            { label: "180 j", d: 180 },
            { label: "1 an", d: 365 },
          ].map((opt) => {
            const active = perfDays === opt.d;
            return (
              <Pressable
                key={opt.label}
                testID={`perf-days-${opt.d}`}
                style={[s.expChip, active && s.expChipActive]}
                onPress={() => onUpdate(opt.d)}
                disabled={busy}
              >
                <Text style={[s.expChipTxt, active && s.expChipTxtActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {busy ? <ActivityIndicator color={T.color.brand} style={{ marginTop: T.space.sm }} /> : null}
      </View>
    </>
  );
}


################################################################################
