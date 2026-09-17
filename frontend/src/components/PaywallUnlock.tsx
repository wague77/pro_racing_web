import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";

// Version par défaut (Web / iOS / aperçu) : l'achat intégré n'est pas disponible ici.
// Metro charge automatiquement PaywallUnlock.android.tsx sur Android.
export default function PaywallUnlock(_props: { productId: string; onUnlocked: () => void }) {
  return (
    <View style={styles.box}>
      <Ionicons name="information-circle-outline" size={20} color={T.color.muted} />
      <Text style={styles.txt}>
        L&apos;accès complet se débloque depuis l&apos;application mobile.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.space.sm,
    backgroundColor: T.color.surfaceTertiary,
    borderRadius: T.radius.md,
    padding: T.space.md,
  },
  txt: { flex: 1, color: T.color.muted, fontSize: T.font.sm, fontWeight: "600" },
});


################################################################################
