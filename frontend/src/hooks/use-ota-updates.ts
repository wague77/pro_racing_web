import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Updates from "expo-updates";

/**
 * Vérifie et applique automatiquement les mises à jour OTA (expo-updates).
 * - Au démarrage de l'app (cold start)
 * - À chaque retour au premier plan (foreground)
 *
 * No-op en développement, sur le web, et dans Expo Go (Updates.isEnabled = false).
 * Aucune réinstallation nécessaire : le nouveau bundle JS est téléchargé puis
 * l'app se recharge automatiquement.
 */
export function useOtaUpdates() {
  const busy = useRef(false);

  const checkAndApply = async () => {
    if (busy.current) return;
    // Désactivé en dev / web / Expo Go
    if (!Updates.isEnabled || Platform.OS === "web" || __DEV__) return;
    busy.current = true;
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch {
      /* réseau indisponible ou aucune update — on ignore silencieusement */
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    checkAndApply();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") checkAndApply();
    });
    return () => sub.remove();
  }, []);
}


################################################################################
