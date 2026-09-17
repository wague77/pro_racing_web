import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import { s } from "./styles";

export function FreeAccess({
  state,
  busy,
  onUpdate,
}: {
  state: { active: boolean; expires_at: string | null };
  busy: boolean;
  onUpdate: (enabled: boolean, hours: number | null) => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>ACCÈS LIBRE (TEMPORAIRE)</Text>
      <View style={s.card}>
        <View style={s.freeHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{state.active ? "Accès libre activé" : "Accès libre désactivé"}</Text>
            <Text style={s.cardSub}>
              {state.active
                ? state.expires_at
                  ? `Jusqu'au ${new Date(state.expires_at).toLocaleString("fr-FR")}`
                  : "Durée illimitée"
                : "Autorisez l'entrée sans code pour une durée limitée."}
            </Text>
          </View>
          <View style={[s.dot, { backgroundColor: state.active ? T.color.success : T.color.borderStrong }]} />
        </View>

        <View style={s.durRow}>
          {[
            { label: "1h", h: 1 },
            { label: "6h", h: 6 },
            { label: "24h", h: 24 },
            { label: "Illimité", h: null as number | null },
          ].map((opt) => (
            <Pressable
              key={opt.label}
              testID={`free-${opt.label}`}
              style={s.durChip}
              onPress={() => onUpdate(true, opt.h)}
              disabled={busy}
            >
              <Text style={s.durTxt}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {state.active ? (
          <Pressable
            testID="free-disable-button"
            style={s.disableBtn}
            onPress={() => onUpdate(false, null)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={T.color.error} />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={16} color={T.color.error} />
                <Text style={s.disableTxt}>{"Désactiver l'accès libre"}</Text>
              </>
            )}
          </Pressable>
        ) : busy ? (
          <ActivityIndicator color={T.color.brand} style={{ marginTop: T.space.sm }} />
        ) : null}
      </View>
    </>
  );
}


################################################################################
