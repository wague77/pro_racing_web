import React from "react";
import { Tabs, Redirect } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function TabsLayout() {
  const { token, loading } = useAuth();
  const insets = useSafeAreaInsets();
  // S'adapte à la barre de navigation gestuelle Android / au home indicator iOS
  // sur tous les appareils, pour que les onglets restent toujours visibles.
  const bottomInset = Math.max(insets.bottom, 8);
  if (!loading && !token) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.color.brand,
        tabBarInactiveTintColor: T.color.muted,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0.5,
          borderTopColor: T.color.border,
          backgroundColor: Platform.OS === "android" ? T.color.surfaceSecondary : "rgba(255,255,255,0.85)",
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarBackground:
          Platform.OS === "ios"
            ? () => <BlurView tint="light" intensity={80} style={{ flex: 1 }} />
            : undefined,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Réunions",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pronostics"
        options={{
          title: "Pronostics",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favoris"
        options={{
          title: "Favoris",
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: "Compte",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}


################################################################################
