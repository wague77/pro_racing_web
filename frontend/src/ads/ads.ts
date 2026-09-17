import { Platform } from "react-native";

// IDs AdMob de production (fournis par le propriétaire de l'app).
export const ADMOB = {
  banner: "ca-app-pub-5323776981488004/7848516068",
  interstitial: "ca-app-pub-5323776981488004/3802258601",
  rewarded: "ca-app-pub-5323776981488004/5325197025",
};

// Chargement natif protégé : no-op sur web / Expo Go (module natif absent).
let mod: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("react-native-google-mobile-ads");
  } catch {
    mod = null;
  }
}

export const hasAds = !!mod && Platform.OS !== "web";
export const ads = mod;

export async function initAds() {
  if (!hasAds) return;
  try {
    await mod.default().initialize();
  } catch {
    /* ignore */
  }
}

// IDs de test en développement, IDs réels en production (règle Google).
export const bannerUnitId = hasAds && __DEV__ ? mod.TestIds.BANNER : ADMOB.banner;
export const interstitialUnitId = hasAds && __DEV__ ? mod.TestIds.INTERSTITIAL : ADMOB.interstitial;
export const rewardedUnitId = hasAds && __DEV__ ? mod.TestIds.REWARDED : ADMOB.rewarded;


################################################################################
