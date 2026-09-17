import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { T, IMAGES } from "@/src/theme";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithCode, signInFree, signInDemo, expiredNotice, clearExpiredNotice } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [freeActive, setFreeActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (expiredNotice) {
      setError(expiredNotice);
      clearExpiredNotice();
    }
  }, [expiredNotice, clearExpiredNotice]);

  useEffect(() => {
    api
      .freeAccessStatus()
      .then((s) => setFreeActive(!!s.active))
      .catch(() => setFreeActive(false));
  }, []);

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const submit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithCode(code.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Code invalide");
      runShake();
    } finally {
      setLoading(false);
    }
  };

  const submitFree = async () => {
    if (freeLoading) return;
    setFreeLoading(true);
    setError(null);
    try {
      await signInFree();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Accès libre indisponible");
      setFreeActive(false);
    } finally {
      setFreeLoading(false);
    }
  };

  const submitDemo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    setError(null);
    try {
      await signInDemo();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Mode démo indisponible");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={IMAGES.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={["rgba(28,28,30,0.55)", "rgba(28,28,30,0.75)", "#1C1C1E"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="ribbon" size={26} color={T.color.onBrand} />
            </View>
            <Text style={styles.brand}>Pro-Racing Stats</Text>
          </View>
          <Text style={styles.tagline}>
            Horse Data Analysis{"\n"}Réunions · Statistiques · Données
          </Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + T.space.lg }]}>
          <Text style={styles.sheetTitle}>{"Entrez votre code d'accès"}</Text>
          <Text style={styles.sheetSub}>
            Un code fourni par votre administrateur est requis pour continuer.
          </Text>
          <View testID="demo-hint" style={styles.demoHintBox}>
            <Ionicons name="information-circle" size={15} color={T.color.brand} />
            <Text style={styles.demoHintTxt}>
              Version Démo · Utilisez le code : <Text style={styles.demoHintCode}>DEMO2026</Text>
            </Text>
          </View>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <TextInput
              testID="access-code-input"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="EX : DEMO2026"
              placeholderTextColor={T.color.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, error ? styles.inputError : null]}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </Animated.View>
          {error ? (
            <Text testID="login-error" style={styles.errTxt}>
              {error}
            </Text>
          ) : null}
          <Pressable
            testID="validate-button"
            style={[styles.cta, (!code.trim() || loading) && styles.ctaDisabled]}
            onPress={submit}
            disabled={!code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={T.color.onBrand} />
            ) : (
              <Text style={styles.ctaTxt}>Valider</Text>
            )}
          </Pressable>

          {freeActive ? (
            <Pressable testID="free-access-button" style={styles.freeBtn} onPress={submitFree} disabled={freeLoading}>
              {freeLoading ? (
                <ActivityIndicator color={T.color.brand} />
              ) : (
                <>
                  <Ionicons name="flash" size={16} color={T.color.brand} />
                  <Text style={styles.freeTxt}>Entrer en accès libre</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <View style={styles.demoDivider}>
            <View style={styles.demoLine} />
            <Text style={styles.demoOr}>ou</Text>
            <View style={styles.demoLine} />
          </View>
          <Pressable testID="demo-button" style={styles.demoBtn} onPress={submitDemo} disabled={demoLoading}>
            {demoLoading ? (
              <ActivityIndicator color={T.color.brand} />
            ) : (
              <>
                <Ionicons name="play-circle-outline" size={18} color={T.color.brand} />
                <Text style={styles.demoTxt}>Essayer en mode démo (gratuit)</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.demoHint}>3 courses · aperçu des fonctionnalités</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1C1C1E" },
  content: { flex: 1, paddingHorizontal: T.space.xl },
  logoRow: { flexDirection: "row", alignItems: "center", gap: T.space.md },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.5, flex: 1 },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: T.font.lg, marginTop: T.space.lg, lineHeight: 24 },
  sheet: {
    backgroundColor: T.color.surfaceSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: T.space.xl,
    paddingTop: T.space.xl,
  },
  sheetTitle: { fontSize: T.font.xl, fontWeight: "800", color: T.color.onSurface },
  sheetSub: { fontSize: T.font.base, color: T.color.muted, marginTop: 6, lineHeight: 20 },
  demoHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.color.brandSecondary,
    borderRadius: T.radius.md,
    paddingVertical: 8,
    paddingHorizontal: T.space.md,
    marginTop: T.space.md,
  },
  demoHintTxt: { flex: 1, fontSize: T.font.sm, color: T.color.brandDark, fontWeight: "600" },
  demoHintCode: { fontWeight: "800", color: T.color.brand, letterSpacing: 1 },
  input: {
    marginTop: T.space.lg,
    backgroundColor: T.color.surfaceTertiary,
    borderRadius: T.radius.md,
    paddingHorizontal: T.space.lg,
    paddingVertical: 16,
    fontSize: T.font.xl,
    fontWeight: "700",
    letterSpacing: 3,
    color: T.color.onSurface,
    textAlign: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputError: { borderColor: T.color.error },
  errTxt: { color: T.color.error, fontSize: T.font.base, marginTop: T.space.sm, textAlign: "center" },
  cta: {
    backgroundColor: T.color.brand,
    borderRadius: T.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: T.space.lg,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt: { color: T.color.onBrand, fontSize: T.font.lg, fontWeight: "800" },
  freeBtn: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: T.space.sm,
    borderRadius: T.radius.md,
    borderWidth: 1.5,
    borderColor: T.color.brand,
  },
  freeTxt: { color: T.color.brand, fontSize: T.font.base, fontWeight: "800" },
  demoDivider: { flexDirection: "row", alignItems: "center", gap: T.space.sm, marginTop: T.space.lg },
  demoLine: { flex: 1, height: 0.5, backgroundColor: "rgba(255,255,255,0.25)" },
  demoOr: { color: "rgba(255,255,255,0.6)", fontSize: T.font.sm, fontWeight: "600" },
  demoBtn: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: T.space.md,
    borderRadius: T.radius.md,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  demoTxt: { color: "#fff", fontSize: T.font.base, fontWeight: "800" },
  demoHint: { color: "rgba(255,255,255,0.6)", fontSize: T.font.sm, textAlign: "center", marginTop: 6 },
});


################################################################################
