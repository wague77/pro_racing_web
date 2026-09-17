import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import { s } from "./styles";

export function CodeList({
  codes,
  loading,
  onToggle,
}: {
  codes: any[];
  loading: boolean;
  onToggle: (item: any) => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>CODES ({codes.length})</Text>
      {loading ? (
        <ActivityIndicator color={T.color.brand} style={{ marginTop: 20 }} />
      ) : codes.length === 0 ? (
        <Text style={s.cardSub}>{"Aucun code généré pour l'instant."}</Text>
      ) : (
        codes.map((item) => (
          <View key={item.id} testID={`code-${item.code}`} style={s.codeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.codeVal}>{item.code}</Text>
              <Text style={s.codeMeta}>
                {item.label ? `${item.label} · ` : ""}
                {item.usage_count} utilisation{item.usage_count > 1 ? "s" : ""}
                {item.max_uses ? ` / ${item.max_uses}` : ""}
              </Text>
              <Text
                style={[
                  s.codeExpiry,
                  item.expires_at && new Date(item.expires_at) <= new Date() ? { color: T.color.error } : null,
                ]}
              >
                {item.expires_at
                  ? new Date(item.expires_at) <= new Date()
                    ? "Expiré"
                    : `Expire le ${new Date(item.expires_at).toLocaleDateString("fr-FR")}`
                  : "N'expire jamais"}
              </Text>
            </View>
            <View style={[s.statusPill, item.active ? s.statusOn : s.statusOff]}>
              <Text style={[s.statusTxt, { color: item.active ? T.color.brand : T.color.muted }]}>
                {item.active ? "Actif" : "Désactivé"}
              </Text>
            </View>
            <Pressable
              testID={`code-toggle-${item.code}`}
              hitSlop={8}
              onPress={() => onToggle(item)}
              style={s.toggleBtn}
            >
              <Ionicons
                name={item.active ? "close-circle-outline" : "checkmark-circle-outline"}
                size={24}
                color={item.active ? T.color.error : T.color.brand}
              />
            </Pressable>
          </View>
        ))
      )}
    </>
  );
}


################################################################################
