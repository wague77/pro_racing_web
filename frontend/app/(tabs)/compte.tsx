import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { T } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { s, AnalysisCfg } from "@/src/components/admin/styles";
import { AnalysisConfig } from "@/src/components/admin/AnalysisConfig";
import { SharingAlerts } from "@/src/components/admin/SharingAlerts";
import { DeviceList } from "@/src/components/admin/DeviceList";
import { PerfConfig } from "@/src/components/admin/PerfConfig";
import { FreeAccess } from "@/src/components/admin/FreeAccess";
import { CodeGenerator } from "@/src/components/admin/CodeGenerator";
import { CodeList } from "@/src/components/admin/CodeList";

export default function Compte() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, token, adminToken, signInAdmin, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [codes, setCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [myExpiry, setMyExpiry] = useState<string | null>(null);

  const [freeState, setFreeState] = useState<{ active: boolean; expires_at: string | null }>({
    active: false,
    expires_at: null,
  });
  const [freeBusy, setFreeBusy] = useState(false);

  const [perfDays, setPerfDays] = useState<number | null>(null);
  const [perfBusy, setPerfBusy] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ count: number; android: number; ios: number }>({
    count: 0,
    android: 0,
    ios: 0,
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [shareThreshold, setShareThreshold] = useState<number | null>(null);

  const [analysisCfg, setAnalysisCfg] = useState<AnalysisCfg | null>(null);
  const [cfgBusy, setCfgBusy] = useState(false);

  const loadMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.me(token);
      setMyExpiry(res.expires_at || null);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadPerfConfig = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getPerfConfig(adminToken);
      setPerfDays(res.days);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadDevices = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.listDevices(adminToken);
      setDevices(res.devices || []);
      setDeviceStats({ count: res.count || 0, android: res.android || 0, ios: res.ios || 0 });
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadAlerts = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.sharingAlerts(adminToken);
      setAlerts(res.alerts || []);
      setShareThreshold(res.threshold);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadAnalysisCfg = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getAnalysisConfig(adminToken);
      setAnalysisCfg(res);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadFree = useCallback(async () => {
    try {
      const st = await api.freeAccessStatus();
      setFreeState({ active: !!st.active, expires_at: st.expires_at || null });
    } catch {
      /* ignore */
    }
  }, []);

  const loadCodes = useCallback(async () => {
    if (!adminToken) return;
    setCodesLoading(true);
    try {
      const res = await api.listCodes(adminToken);
      setCodes(res || []);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setCodesLoading(false);
    }
  }, [adminToken]);

  useFocusEffect(
    useCallback(() => {
      loadCodes();
      loadFree();
      loadMe();
      loadPerfConfig();
      loadDevices();
      loadAlerts();
      loadAnalysisCfg();
    }, [loadCodes, loadFree, loadMe, loadPerfConfig, loadDevices, loadAlerts, loadAnalysisCfg])
  );

  // Rafraîchit les données admin dès que la connexion admin change.
  useEffect(() => {
    if (adminToken) {
      loadCodes();
      loadFree();
      loadPerfConfig();
      loadDevices();
      loadAlerts();
      loadAnalysisCfg();
    }
  }, [adminToken, loadCodes, loadFree, loadPerfConfig, loadDevices, loadAlerts, loadAnalysisCfg]);

  const stepCfg = (key: keyof AnalysisCfg, delta: number, min: number, max: number) => {
    setAnalysisCfg((c) => (c ? { ...c, [key]: Math.min(max, Math.max(min, +(c[key] + delta).toFixed(1))) } : c));
  };

  const saveAnalysisCfg = async () => {
    if (!adminToken || !analysisCfg) return;
    setCfgBusy(true);
    setActionErr(null);
    try {
      const res = await api.setAnalysisConfig(analysisCfg, adminToken);
      setAnalysisCfg(res);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setCfgBusy(false);
    }
  };

  const updateThreshold = async (t: number) => {
    if (!adminToken) return;
    try {
      const res = await api.setShareConfig(t, adminToken);
      setShareThreshold(res.threshold);
      await loadAlerts();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const blockCodeDevices = async (code: string) => {
    if (!adminToken) return;
    try {
      await api.blockCodeDevices(code, adminToken);
      await loadDevices();
      await loadAlerts();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const updatePerf = async (days: number) => {
    if (!adminToken) return;
    setPerfBusy(true);
    setActionErr(null);
    try {
      const res = await api.setPerfConfig(days, adminToken);
      setPerfDays(res.days);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setPerfBusy(false);
    }
  };

  const updateFree = async (enabled: boolean, hours: number | null) => {
    if (!adminToken) return;
    setFreeBusy(true);
    setActionErr(null);
    try {
      const st = await api.setFreeAccess(enabled, hours, adminToken);
      setFreeState({ active: !!st.active, expires_at: st.expires_at || null });
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setFreeBusy(false);
    }
  };

  const doLogin = async () => {
    if (!password.trim()) return;
    setLoginLoading(true);
    setLoginErr(null);
    try {
      await signInAdmin(password);
      setPassword("");
    } catch (e: any) {
      setLoginErr(e.message || "Échec de connexion");
    } finally {
      setLoginLoading(false);
    }
  };

  const createCode = async (
    label: string | null,
    expiresDays: number | null,
    expiresAt: string | null
  ): Promise<boolean> => {
    if (!adminToken) return false;
    setCreating(true);
    setActionErr(null);
    try {
      await api.createCode(label, null, expiresDays, expiresAt, adminToken);
      await loadCodes();
      return true;
    } catch (e: any) {
      setActionErr(e.message);
      return false;
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (item: any) => {
    if (!adminToken) return;
    try {
      if (item.active) await api.revokeCode(item.id, adminToken);
      else await api.activateCode(item.id, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const toggleDevice = async (dv: any) => {
    if (!adminToken) return;
    try {
      if (dv.blocked) await api.unblockDevice(dv.deviceId, adminToken);
      else await api.blockDevice(dv.deviceId, adminToken);
      await loadDevices();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: insets.top + T.space.sm }]}>
        <Text style={s.title}>Compte</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: T.space.lg, paddingBottom: 120 }}>
        {/* Session */}
        <View style={s.card}>
          <View style={s.sessionRow}>
            <View style={s.avatar}>
              <Ionicons name="person" size={22} color={T.color.brand} />
            </View>
            <View>
              <Text style={s.sessionTitle}>Session active</Text>
              <Text style={s.sessionSub}>Accès {role === "admin" ? "administrateur" : "utilisateur"}</Text>
              <Text style={s.sessionExpiry}>
                {myExpiry
                  ? `Votre accès expire le ${new Date(myExpiry).toLocaleDateString("fr-FR")}`
                  : role === "admin"
                  ? ""
                  : "Accès sans expiration"}
              </Text>
            </View>
          </View>
        </View>

        {/* Admin */}
        <Text style={s.sectionLabel}>ADMINISTRATION</Text>
        {!adminToken ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Connexion administrateur</Text>
            <Text style={s.cardSub}>{"Entrez le mot de passe administrateur pour continuer."}</Text>
            <TextInput
              testID="admin-password"
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor={T.color.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={s.input}
              onSubmitEditing={doLogin}
            />
            {loginErr ? <Text style={s.err}>{loginErr}</Text> : null}
            <Pressable testID="admin-login-button" style={s.primaryBtn} onPress={doLogin} disabled={loginLoading}>
              {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Se connecter</Text>}
            </Pressable>
          </View>
        ) : (
          <>
            <AnalysisConfig cfg={analysisCfg} busy={cfgBusy} onStep={stepCfg} onSave={saveAnalysisCfg} />

            <SharingAlerts
              threshold={shareThreshold}
              alerts={alerts}
              onUpdateThreshold={updateThreshold}
              onBlockCodeDevices={blockCodeDevices}
              onRevokeCode={(codeId) => toggle({ id: codeId, active: true })}
            />

            <DeviceList stats={deviceStats} devices={devices} onToggleDevice={toggleDevice} />

            <PerfConfig perfDays={perfDays} busy={perfBusy} onUpdate={updatePerf} />

            <FreeAccess state={freeState} busy={freeBusy} onUpdate={updateFree} />

            <CodeGenerator creating={creating} onCreate={createCode} />

            {actionErr ? <Text style={s.err}>{actionErr}</Text> : null}

            <CodeList codes={codes} loading={codesLoading} onToggle={toggle} />
          </>
        )}

        {/* Logout */}
        <Pressable testID="logout-button" style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={T.color.error} />
          <Text style={s.logoutTxt}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


################################################################################
