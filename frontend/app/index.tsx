import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/auth";
import { T } from "@/src/theme";

export default function Index() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.color.surface }}>
        <ActivityIndicator color={T.color.brand} size="large" />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)" : "/login"} />;
}


################################################################################
