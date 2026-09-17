import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import { s, AnalysisCfg } from "./styles";
import { CfgStepper } from "./CfgStepper";

export function AnalysisConfig({
  cfg,
  busy,
  onStep,
  onSave,
}: {
  cfg: AnalysisCfg | null;
  busy: boolean;
  onStep: (key: keyof AnalysisCfg, delta: number, min: number, max: number) => void;
  onSave: () => void;
}) {
  return (
    <>
      <Text style={s.sectionLabel}>PARAMÈTRES D&apos;ANALYSE</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Seuils de catégories (cote)</Text>
        <Text style={s.cardSub}>
          Définissent la couleur des chevaux : favori (vert), outsider (orange), tocard (rouge).
        </Text>
        {cfg ? (
          <>
            <CfgStepper
              label="🟢 Favori si cote ≤"
              value={cfg.favoriMax}
              suffix=""
              testID="cfg-favoriMax"
              onMinus={() => onStep("favoriMax", -0.5, 1.5, cfg.outsiderMax - 0.5)}
              onPlus={() => onStep("favoriMax", 0.5, 1.5, cfg.outsiderMax - 0.5)}
            />
            <CfgStepper
              label="🟠 Outsider si cote ≤"
              value={cfg.outsiderMax}
              suffix=""
              testID="cfg-outsiderMax"
              onMinus={() => onStep("outsiderMax", -0.5, cfg.favoriMax + 0.5, 100)}
              onPlus={() => onStep("outsiderMax", 0.5, cfg.favoriMax + 0.5, 100)}
            />
            <Text style={s.cfgHint}>🔴 Tocard = cote &gt; {cfg.outsiderMax}</Text>

            <View style={s.cfgDivider} />
            <Text style={s.cardTitle}>Signal « à jouer »</Text>
            <Text style={s.cardSub}>Sensibilité de la détection sur l&apos;analyse des cotes.</Text>
            <CfgStepper
              label="Baisse de cote min."
              value={cfg.baisseSeuil}
              suffix="%"
              testID="cfg-baisseSeuil"
              onMinus={() => onStep("baisseSeuil", -1, 1, 50)}
              onPlus={() => onStep("baisseSeuil", 1, 1, 50)}
            />
            <CfgStepper
              label="Score IA min."
              value={cfg.scoreMinJouer}
              suffix="/100"
              testID="cfg-scoreMinJouer"
              onMinus={() => onStep("scoreMinJouer", -5, 0, 100)}
              onPlus={() => onStep("scoreMinJouer", 5, 0, 100)}
            />
            <Pressable
              testID="save-analysis-config"
              style={[s.primaryBtn, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={onSave}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnTxt}>Enregistrer les paramètres</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={T.color.brand} style={{ marginTop: T.space.md }} />
        )}
      </View>
    </>
  );
}


################################################################################
