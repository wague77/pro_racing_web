import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { T } from "@/src/theme";
import { s } from "./styles";

export function CodeGenerator({
  creating,
  onCreate,
}: {
  creating: boolean;
  /** Retourne true si la création a réussi (pour réinitialiser le formulaire). */
  onCreate: (label: string | null, expiresDays: number | null, expiresAt: string | null) => Promise<boolean>;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newExpiry, setNewExpiry] = useState<number | null>(7);
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const submit = async () => {
    setLocalErr(null);
    let expiresAt: string | null = null;
    let expiresDays: number | null = null;
    if (showCustom) {
      const d = dayjs(customDate, "DD/MM/YYYY", true);
      if (!d.isValid()) {
        setLocalErr("Date invalide. Format attendu : JJ/MM/AAAA");
        return;
      }
      expiresAt = d.endOf("day").toISOString();
    } else {
      expiresDays = newExpiry;
    }
    const ok = await onCreate(newLabel.trim() || null, expiresDays, expiresAt);
    if (ok) {
      setNewLabel("");
      setCustomDate("");
      setShowCustom(false);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{"Générer un code d'accès"}</Text>
      <TextInput
        testID="new-code-label"
        value={newLabel}
        onChangeText={setNewLabel}
        placeholder="Libellé (optionnel), ex : Ami Paul"
        placeholderTextColor={T.color.muted}
        style={s.input}
      />
      <Text style={s.expiryLabel}>Expiration</Text>
      <View style={s.durRow}>
        {[
          { label: "1 jour", d: 1 },
          { label: "7 jours", d: 7 },
          { label: "30 jours", d: 30 },
          { label: "Jamais", d: null as number | null },
        ].map((opt) => {
          const active = !showCustom && newExpiry === opt.d;
          return (
            <Pressable
              key={opt.label}
              testID={`expiry-${opt.d ?? "never"}`}
              style={[s.expChip, active && s.expChipActive]}
              onPress={() => {
                setShowCustom(false);
                setNewExpiry(opt.d);
              }}
            >
              <Text style={[s.expChipTxt, active && s.expChipTxtActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          testID="expiry-custom"
          style={[s.expChip, showCustom && s.expChipActive]}
          onPress={() => setShowCustom((v) => !v)}
        >
          <Text style={[s.expChipTxt, showCustom && s.expChipTxtActive]}>Date précise</Text>
        </Pressable>
      </View>
      {showCustom ? (
        <TextInput
          testID="custom-date-input"
          value={customDate}
          onChangeText={setCustomDate}
          placeholder="JJ/MM/AAAA"
          placeholderTextColor={T.color.muted}
          keyboardType="numbers-and-punctuation"
          style={s.input}
        />
      ) : null}
      {localErr ? <Text style={s.err}>{localErr}</Text> : null}
      <Pressable testID="create-code-button" style={s.primaryBtn} onPress={submit} disabled={creating}>
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.primaryBtnTxt}>Créer un code</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}


################################################################################
