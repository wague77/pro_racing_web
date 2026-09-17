import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useOtaUpdates } from "@/src/hooks/use-ota-updates";
import { initAds } from "@/src/ads/ads";
import { AuthProvider } from "@/src/auth";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Comportement en avant-plan : afficher l'alerte / son (module scope, avant tout composant)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Canal Android (module scope, avant qu'une notif arrive)
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();
  useOtaUpdates();

  useEffect(() => {
    initAds();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleUrl = (data: any) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      if (String(url).startsWith("http")) Linking.openURL(url);
      else router.push(url);
    };

    // Tap "à chaud" : l'utilisateur tape la notif app ouverte
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleUrl(response.notification.request.content.data || {});
    });

    // Tap "à froid" : app tuée puis relancée via la notif
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleUrl(response.notification.request.content.data || {});
    });

    return () => {
      tapSub.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F7F7F9" } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="meeting" />
            <Stack.Screen name="course" />
            <Stack.Screen name="performance" />
            <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
            <Stack.Screen name="horse" options={{ presentation: "modal" }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


################################################################################
