import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api";

const K_DEVICE_ID = "device_id";

export async function getDeviceId(): Promise<string> {
  let id = await storage.getItem<string>(K_DEVICE_ID, "");
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await storage.setItem(K_DEVICE_ID, id);
  }
  return id;
}

export async function registerDevice(token: string) {
  try {
    const info = {
      deviceId: await getDeviceId(),
      platform: Platform.OS,
      osName: Device.osName ?? undefined,
      osVersion: Device.osVersion ?? undefined,
      model: Device.modelName ?? undefined,
      brand: Device.brand ?? undefined,
      deviceName: Device.deviceName ?? undefined,
      appVersion: (Constants.expoConfig as any)?.version ?? undefined,
    };
    await api.registerDevice(info, token);
  } catch {
    /* silencieux : ne bloque jamais l'app */
  }
}

// Enregistre le token push natif (FCM/APNs) auprès du relais Emergent.
// Ne fonctionne que sur build natif (pas Expo Go / web).
export async function registerPush() {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const userId = await getDeviceId();
    await api.registerPush(userId, Platform.OS, String(tokenResp.data));
  } catch {
    /* silencieux : ne bloque jamais l'app */
  }
}


################################################################################
