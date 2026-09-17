import React, { useEffect, useState } from "react";
import { Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIAP } from "expo-iap";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

// Version Android : achat intégré Google Play via expo-iap.
export default function PaywallUnlock({ productId, onUnlocked }: { productId: string; onUnlocked: () => void }) {
  const { token, setFullSession } = useAuth();
  const [busy, setBusy] = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      try {
        const purchaseToken = purchase?.purchaseToken;
        if (!purchaseToken || !token) throw new Error("Achat incomplet");
        const res = await api.iapVerify(productId, purchaseToken, token);
        await setFullSession(res.access_token, res.role);
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert("Accès débloqué", "Votre accès complet est activé. Merci !");
        onUnlocked();
      } catch (e: any) {
        Alert.alert("Vérification échouée", e?.message || "Impossible de valider l'achat.");
      } finally {
        setBusy(false);
      }
    },
    onPurchaseError: (err: any) => {
      setBusy(false);
      if (err?.code !== "E_USER_CANCELLED") {
        Alert.alert("Achat annulé", err?.message || "L'achat n'a pas abouti.");
      }
    },
  });

  useEffect(() => {
    if (connected) fetchProducts({ skus: [productId], type: "in-app" }).catch(() => {});
  }, [connected, productId, fetchProducts]);

  const product = products.find((p: any) => p.id === productId || p.productId === productId);
  const price = (product as any)?.displayPrice || (product as any)?.localizedPrice || "";

  const handleBuy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestPurchase({
        request: { apple: { sku: productId }, google: { skus: [productId] } },
        type: "in-app",
      } as any);
    } catch (e: any) {
      setBusy(false);
      Alert.alert("Erreur", e?.message || "Impossible de lancer l'achat.");
    }
  };

  return (
    <Pressable testID="unlock-buy-button" style={[styles.btn, busy && { opacity: 0.7 }]} disabled={busy} onPress={handleBuy}>
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name="lock-open" size={18} color="#fff" />
          <Text style={styles.btnTxt}>Débloquer l&apos;accès complet{price ? ` · ${price}` : ""}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.color.brand,
    borderRadius: T.radius.md,
    paddingVertical: 16,
  },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: T.font.lg },
});


################################################################################
