import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import { s } from "./styles";

export function CfgStepper({
  label,
  value,
  suffix,
  testID,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  suffix: string;
  testID: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={s.cfgRow}>
      <Text style={s.cfgLabel}>{label}</Text>
      <View style={s.cfgStepper}>
        <Pressable testID={`${testID}-minus`} hitSlop={8} style={s.stepBtn} onPress={onMinus}>
          <Ionicons name="remove" size={18} color={T.color.brand} />
        </Pressable>
        <Text testID={`${testID}-value`} style={s.cfgVal}>
          {value}
          {suffix}
        </Text>
        <Pressable testID={`${testID}-plus`} hitSlop={8} style={s.stepBtn} onPress={onPlus}>
          <Ionicons name="add" size={18} color={T.color.brand} />
        </Pressable>
      </View>
    </View>
  );
}


################################################################################
