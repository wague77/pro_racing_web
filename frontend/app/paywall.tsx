import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { T } from "@/src/theme";
import { useAuth } from "@/src/auth";
import PaywallUnlock from "@/src/components/PaywallUnlock";

const PRODUCT_ID = process.env.EXPO_PUBLIC_IAP_PRODUCT_ID || "full_access_unlock";

const FEATURES = [
  { icon: "analytics", text: "Pronostic IA complet · Top 8 + Tocards" },
  { icon: "pulse", text: "Analyse des cotes & cotes cibles au départ" },
  { icon: "stats-chart", text: "Tableau de performance IA (Quinté+)" },
  { icon: "calendar", text: "Toutes les courses de toutes les réunions" },
  { icon: "trophy", text: "Résultats, écarts et historique complet" },
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithCode } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goHome = () => router.replace("/(tabs)");

  const activateCode = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setErr(null);
    try {
      await signInWithCode(code.trim());
      goHome();
    } catch (e: any) {
      setErr(e?.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + T.space.sm }]}>
        <Pressable testID="paywall-back" hitSlop={12} onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headTitle}>Accès complet</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: insets.bottom + 40 }}>
          <View style={styles.hero}>
            <Ionicons name="lock-open" size={30} color={T.color.brand} />
            <Text style={styles.heroTitle}>Débloquez toutes les fonctionnalités</Text>
            <Text style={styles.heroSub}>Vous êtes en mode démo (3 courses, aperçu limité).</Text>
          </View>

          <View style={styles.card}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.featRow}>
                <View style={styles.featIcon}>
                  <Ionicons name={f.icon as any} size={16} color={T.color.brand} />
                </View>
                <Text style={styles.featTxt}>{f.text}</Text>
              </View>
            ))}
          </View>

          <PaywallUnlock productId={PRODUCT_ID} onUnlocked={goHome} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>Déjà un code d&apos;activation ?</Text>
            <View style={styles.line} />
          </View>

          <TextInput
            testID="activation-code-input"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="EX : TURFPRO1"
            placeholderTextColor={T.color.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={activateCode}
            returnKeyType="go"
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable
            testID="activate-code-button"
            style={[styles.codeBtn, (!code.trim() || loading) && { opacity: 0.5 }]}
            disabled={!code.trim() || loading}
            onPress={activateCode}
          >
            {loading ? <ActivityIndicator color={T.color.brand} /> : <Text style={styles.codeBtnTxt}>Activer le code</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.color.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.color.brandDark,
    paddingHorizontal: T.space.lg,
    paddingBottom: T.space.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headTitle: { color: "#fff", fontSize: T.font.xl, fontWeight: "800" },
  hero: { alignItems: "center", gap: 6, marginBottom: T.space.lg },
  heroTitle: { fontSize: T.font.xl, fontWeight: "800", color: T.color.onSurface, textAlign: "center" },
  heroSub: { fontSize: T.font.base, color: T.color.muted, textAlign: "center" },
  card: {
    backgroundColor: T.color.surfaceSecondary,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    marginBottom: T.space.lg,
    gap: T.space.md,
    ...T.shadow.card,
  },
  featRow: { flexDirection: "row", alignItems: "center", gap: T.space.md },
  featIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.color.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  featTxt: { flex: 1, fontSize: T.font.base, color: T.color.onSurface, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: T.space.sm, marginVertical: T.space.lg },
  line: { flex: 1, height: 0.5, backgroundColor: T.color.border },
  or: { color: T.color.muted, fontSize: T.font.sm, fontWeight: "600" },
  input: {
    backgroundColor: T.color.surfaceTertiary,
    borderRadius: T.radius.md,
    paddingHorizontal: T.space.lg,
    paddingVertical: 14,
    fontSize: T.font.lg,
    fontWeight: "700",
    letterSpacing: 2,
    color: T.color.onSurface,
    textAlign: "center",
  },
  err: { color: T.color.error, fontSize: T.font.base, marginTop: T.space.sm, textAlign: "center" },
  codeBtn: {
    borderWidth: 1.5,
    borderColor: T.color.brand,
    borderRadius: T.radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: T.space.md,
  },
  codeBtnTxt: { color: T.color.brand, fontWeight: "800", fontSize: T.font.base },
});


################################################################################
