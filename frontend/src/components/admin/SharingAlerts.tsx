import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s } from "./styles";

export function SharingAlerts({
  threshold,
  alerts,
  onUpdateThreshold,
  onBlockCodeDevices,
  onRevokeCode,
}: {
  threshold: number | null;
  alerts: any[];
  onUpdateThreshold: (t: number) => void;
  onBlockCodeDevices: (code: string) => void;
  onRevokeCode: (codeId: string) => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>DÉTECTION DE PARTAGE</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Seuil d&apos;alerte</Text>
        <Text style={s.cardSub}>
          {threshold
            ? `Alerte si un code est utilisé sur ${threshold} appareils ou plus.`
            : "Nombre d'appareils actifs déclenchant une alerte."}
        </Text>
        <View style={s.durRow}>
          {[2, 3, 5, 10].map((t) => {
            const active = threshold === t;
            return (
              <Pressable
                key={t}
                testID={`share-threshold-${t}`}
                style={[s.expChip, active && s.expChipActive]}
                onPress={() => onUpdateThreshold(t)}
              >
                <Text style={[s.expChipTxt, active && s.expChipTxtActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {alerts.length > 0 ? (
        alerts.map((al) => (
          <View key={al.code} testID={`share-alert-${al.code}`} style={s.alertCard}>
            <View style={s.alertHead}>
              <Ionicons name="warning" size={18} color="#B45309" />
              <Text style={s.alertTitle}>Partage suspecté · code {al.code}</Text>
            </View>
            <Text style={s.alertSub}>
              {al.active} appareil{al.active > 1 ? "s" : ""} actif{al.active > 1 ? "s" : ""}
              {al.blocked ? ` · ${al.blocked} bloqué(s)` : ""} (seuil {threshold})
            </Text>
            <View style={s.alertBtns}>
              <Pressable
                testID={`alert-block-${al.code}`}
                style={s.alertBlockBtn}
                onPress={() => onBlockCodeDevices(al.code)}
              >
                <Ionicons name="phone-portrait-outline" size={15} color="#fff" />
                <Text style={s.alertBlockTxt}>Bloquer les appareils</Text>
              </Pressable>
              {al.codeId && al.codeActive ? (
                <Pressable
                  testID={`alert-revoke-${al.code}`}
                  style={s.alertRevokeBtn}
                  onPress={() => onRevokeCode(al.codeId)}
                >
                  <Text style={s.alertRevokeTxt}>Révoquer le code</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={s.noAlert}>✓ Aucun partage suspect détecté.</Text>
      )}
    </>
  );
}


################################################################################
