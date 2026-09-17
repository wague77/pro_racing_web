import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { hasAds, ads, bannerUnitId } from "@/src/ads/ads";

// Bannière ancrée en bas d'écran. Affichée UNIQUEMENT en mode démo/gratuit,
// et uniquement sur un build natif (no-op sur web / Expo Go).
export default function AdBanner() {
  const insets = useSafeAreaInsets();
  const { isDemo } = useAuth();

  if (!isDemo || !hasAds) return null;

  const BannerAd = ads.BannerAd;
  const BannerAdSize = ads.BannerAdSize;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <BannerAd unitId={bannerUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
  },
});


################################################################################
