import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { s } from "./styles";

export function DeviceList({
  stats,
  devices,
  onToggleDevice,
}: {
  stats: { count: number; android: number; ios: number };
  devices: any[];
  onToggleDevice: (dv: any) => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>APPAREILS INSTALLÉS ({stats.count})</Text>
      <View style={s.card}>
        <View style={s.devStatsRow}>
          <View style={s.devStat}>
            <Text style={s.devStatVal}>{stats.count}</Text>
            <Text style={s.devStatLbl}>Total</Text>
          </View>
          <View style={s.devStat}>
            <Ionicons name="logo-apple" size={16} color={T.color.onSurface} />
            <Text style={s.devStatVal}>{stats.ios}</Text>
            <Text style={s.devStatLbl}>iPhone</Text>
          </View>
          <View style={s.devStat}>
            <Ionicons name="logo-android" size={16} color={T.color.brand} />
            <Text style={s.devStatVal}>{stats.android}</Text>
            <Text style={s.devStatLbl}>Android</Text>
          </View>
        </View>
        {devices.length === 0 ? (
          <Text style={s.cardSub}>Aucun appareil enregistré pour l&apos;instant.</Text>
        ) : (
          devices.map((dv) => (
            <View key={dv.deviceId} testID={`device-${dv.deviceId}`} style={s.devRow}>
              <Ionicons
                name={
                  dv.platform === "ios"
                    ? "logo-apple"
                    : dv.platform === "android"
                    ? "logo-android"
                    : "globe-outline"
                }
                size={22}
                color={dv.platform === "android" ? T.color.brand : T.color.onSurface}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.devName} numberOfLines={1}>
                  {dv.model || dv.deviceName || "Appareil"}
                  {dv.blocked ? "  🚫" : ""}
                </Text>
                <Text style={s.devMeta} numberOfLines={1}>
                  {dv.osName || dv.platform || ""}
                  {dv.osVersion ? ` ${dv.osVersion}` : ""}
                  {dv.code ? ` · code ${dv.code}` : ""}
                </Text>
                <Text style={s.devSeen}>
                  Vu {dv.last_seen ? dayjs(dv.last_seen).fromNow() : "récemment"} ·{" "}
                  {dv.sessions || 1} session{(dv.sessions || 1) > 1 ? "s" : ""}
                </Text>
              </View>
              <Pressable
                testID={`device-toggle-${dv.deviceId}`}
                hitSlop={8}
                onPress={() => onToggleDevice(dv)}
                style={[s.devBtn, dv.blocked ? s.devBtnUnblock : s.devBtnBlock]}
              >
                <Text style={[s.devBtnTxt, { color: dv.blocked ? T.color.brand : T.color.error }]}>
                  {dv.blocked ? "Débloquer" : "Bloquer"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </>
  );
}


################################################################################
