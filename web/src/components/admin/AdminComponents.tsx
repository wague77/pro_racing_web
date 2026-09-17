"use client";

import React, { useState } from "react";
import dayjs from "dayjs";
import { Plus, Minus, Lock, Unlock, PhoneOff, XCircle, CheckCircle, Smartphone, MonitorSmartphone, AlertTriangle } from "lucide-react";

export type AnalysisCfg = {
  favoriMax: number;
  outsiderMax: number;
  baisseSeuil: number;
  scoreMinJouer: number;
};

// ==========================================
// CfgStepper
// ==========================================
function CfgStepper({
  label,
  value,
  suffix,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  suffix: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex flex-row items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex flex-row items-center gap-3">
        <button onClick={onMinus} className="p-1 rounded-full bg-green-50 text-[#10B981] hover:bg-green-100">
          <Minus size={16} />
        </button>
        <span className="text-base font-bold text-gray-900 w-12 text-center">
          {value}
          {suffix}
        </span>
        <button onClick={onPlus} className="p-1 rounded-full bg-green-50 text-[#10B981] hover:bg-green-100">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// AnalysisConfig
// ==========================================
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
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Paramètres d'analyse</h3>
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h4 className="font-extrabold text-gray-900 text-base">Seuils de catégories (cote)</h4>
          <p className="text-sm text-gray-500 mt-1">
            Définissent la couleur des chevaux : favori (vert), outsider (orange), tocard (rouge).
          </p>
        </div>
        
        {cfg ? (
          <div className="flex flex-col">
            <CfgStepper
              label="🟢 Favori si cote ≤"
              value={cfg.favoriMax}
              suffix=""
              onMinus={() => onStep("favoriMax", -0.5, 1.5, cfg.outsiderMax - 0.5)}
              onPlus={() => onStep("favoriMax", 0.5, 1.5, cfg.outsiderMax - 0.5)}
            />
            <CfgStepper
              label="🟠 Outsider si cote ≤"
              value={cfg.outsiderMax}
              suffix=""
              onMinus={() => onStep("outsiderMax", -0.5, cfg.favoriMax + 0.5, 100)}
              onPlus={() => onStep("outsiderMax", 0.5, cfg.favoriMax + 0.5, 100)}
            />
            <p className="text-xs text-gray-400 font-semibold mt-2">🔴 Tocard = cote &gt; {cfg.outsiderMax}</p>

            <div className="h-px bg-gray-200 my-4" />
            
            <div>
              <h4 className="font-extrabold text-gray-900 text-base">Signal « à jouer »</h4>
              <p className="text-sm text-gray-500 mt-1 mb-2">Sensibilité de la détection sur l'analyse des cotes.</p>
            </div>

            <CfgStepper
              label="Baisse de cote min."
              value={cfg.baisseSeuil}
              suffix="%"
              onMinus={() => onStep("baisseSeuil", -1, 1, 50)}
              onPlus={() => onStep("baisseSeuil", 1, 1, 50)}
            />
            <CfgStepper
              label="Score IA min."
              value={cfg.scoreMinJouer}
              suffix="/100"
              onMinus={() => onStep("scoreMinJouer", -5, 0, 100)}
              onPlus={() => onStep("scoreMinJouer", 5, 0, 100)}
            />
            
            <button
              disabled={busy}
              onClick={onSave}
              className={`mt-4 w-full flex items-center justify-center py-3 rounded-lg font-bold text-white transition-colors ${busy ? "bg-green-300" : "bg-[#10B981] hover:bg-green-600"}`}
            >
              {busy ? "Enregistrement..." : "Enregistrer les paramètres"}
            </button>
          </div>
        ) : (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SharingAlerts
// ==========================================
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
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Détection de partage</h3>
      
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3 mb-3">
        <div>
          <h4 className="font-extrabold text-gray-900 text-base">Seuil d'alerte</h4>
          <p className="text-sm text-gray-500 mt-1">
            {threshold
              ? `Alerte si un code est utilisé sur ${threshold} appareils ou plus.`
              : "Nombre d'appareils actifs déclenchant une alerte."}
          </p>
        </div>
        <div className="flex flex-row flex-wrap gap-2">
          {[2, 3, 5, 10].map((t) => {
            const active = threshold === t;
            return (
              <button
                key={t}
                onClick={() => onUpdateThreshold(t)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${active ? "bg-[#10B981] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {alerts.length > 0 ? (
        alerts.map((al) => (
          <div key={al.code} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <h4 className="font-extrabold text-amber-900 text-sm">Partage suspecté · code {al.code}</h4>
            </div>
            <p className="text-sm text-amber-700">
              {al.active} appareil{al.active > 1 ? "s" : ""} actif{al.active > 1 ? "s" : ""}
              {al.blocked ? ` · ${al.blocked} bloqué(s)` : ""} (seuil {threshold})
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={() => onBlockCodeDevices(al.code)}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                <PhoneOff size={16} />
                Bloquer les appareils
              </button>
              {al.codeId && al.codeActive ? (
                <button
                  onClick={() => onRevokeCode(al.codeId)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                >
                  Révoquer le code
                </button>
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm font-semibold text-green-600 mt-2">✓ Aucun partage suspect détecté.</p>
      )}
    </div>
  );
}

// ==========================================
// DeviceList
// ==========================================
export function DeviceList({
  stats,
  devices,
  onToggleDevice,
}: {
  stats: { count: number; android: number; ios: number; web?: number };
  devices: any[];
  onToggleDevice: (dv: any) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Appareils installés ({stats.count})</h3>
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex flex-row justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex flex-col items-center">
            <span className="text-xl font-extrabold text-gray-900">{stats.count}</span>
            <span className="text-xs font-bold text-gray-500 uppercase mt-1">Total</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Smartphone size={14} className="text-gray-700" />
              <span className="text-lg font-extrabold text-gray-900">{stats.ios}</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase mt-1">iPhone</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Smartphone size={14} className="text-[#10B981]" />
              <span className="text-lg font-extrabold text-[#10B981]">{stats.android}</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase mt-1">Android</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <MonitorSmartphone size={14} className="text-blue-500" />
              <span className="text-lg font-extrabold text-blue-500">{stats.web || 0}</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase mt-1">Web</span>
          </div>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun appareil enregistré pour l'instant.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {devices.map((dv) => (
              <div key={dv.deviceId} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Smartphone size={20} className={dv.platform === "android" ? "text-[#10B981]" : dv.platform === "web" ? "text-blue-500" : "text-gray-700"} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="font-bold text-gray-900 truncate text-sm">
                    {dv.model || dv.deviceName || "Appareil"}
                    {dv.blocked ? " 🚫" : ""}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {dv.osName || dv.platform || ""} {dv.osVersion ? ` ${dv.osVersion}` : ""}
                    {dv.code ? ` · code ${dv.code}` : ""}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    Vu {dv.last_seen ? dayjs(dv.last_seen).fromNow() : "récemment"} · {dv.sessions || 1} session{(dv.sessions || 1) > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => onToggleDevice(dv)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${dv.blocked ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                >
                  {dv.blocked ? "Débloquer" : "Bloquer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PerfConfig
// ==========================================
export function PerfConfig({
  perfDays,
  busy,
  onUpdate,
}: {
  perfDays: number | null;
  busy: boolean;
  onUpdate: (days: number) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Performance IA · Quinté+</h3>
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
        <div>
          <h4 className="font-extrabold text-gray-900 text-base">Période d'analyse</h4>
          <p className="text-sm text-gray-500 mt-1">
            {perfDays ? `Actuellement : ${perfDays} jours` : "Choisissez la période du bilan Quinté+."}
          </p>
        </div>
        <div className="flex flex-row flex-wrap gap-2">
          {[
            { label: "7 j", d: 7 },
            { label: "30 j", d: 30 },
            { label: "90 j", d: 90 },
            { label: "180 j", d: 180 },
            { label: "1 an", d: 365 },
          ].map((opt) => {
            const active = perfDays === opt.d;
            return (
              <button
                key={opt.label}
                disabled={busy}
                onClick={() => onUpdate(opt.d)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${active ? "bg-[#10B981] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} ${busy ? "opacity-50" : ""}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// FreeAccess
// ==========================================
export function FreeAccess({
  state,
  busy,
  onUpdate,
}: {
  state: { active: boolean; expires_at: string | null };
  busy: boolean;
  onUpdate: (enabled: boolean, hours: number | null) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Accès Libre (Temporaire)</h3>
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-gray-900 text-base">{state.active ? "Accès libre activé" : "Accès libre désactivé"}</h4>
            <p className="text-sm text-gray-500 mt-1">
              {state.active
                ? state.expires_at
                  ? `Jusqu'au ${new Date(state.expires_at).toLocaleString("fr-FR")}`
                  : "Durée illimitée"
                : "Autorisez l'entrée sans code pour une durée limitée."}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${state.active ? "bg-[#10B981]" : "bg-gray-300"}`} />
        </div>

        <div className="flex flex-row flex-wrap gap-2">
          {[
            { label: "1h", h: 1 },
            { label: "6h", h: 6 },
            { label: "24h", h: 24 },
            { label: "Illimité", h: null },
          ].map((opt) => (
            <button
              key={opt.label}
              disabled={busy}
              onClick={() => onUpdate(true, opt.h)}
              className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {state.active && (
          <button
            disabled={busy}
            onClick={() => onUpdate(false, null)}
            className="flex items-center justify-center gap-2 w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <Lock size={16} />
            Désactiver l'accès libre
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CodeGenerator
// ==========================================
export function CodeGenerator({
  creating,
  onCreate,
}: {
  creating: boolean;
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
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Générer un code</h3>
      <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Libellé (optionnel), ex : Ami Paul"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 outline-none focus:border-[#10B981] transition-colors"
        />
        
        <div>
          <span className="text-sm font-semibold text-gray-700 mb-2 block">Expiration</span>
          <div className="flex flex-row flex-wrap gap-2">
            {[
              { label: "1 jour", d: 1 },
              { label: "7 jours", d: 7 },
              { label: "30 jours", d: 30 },
              { label: "Jamais", d: null },
            ].map((opt) => {
              const active = !showCustom && newExpiry === opt.d;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    setShowCustom(false);
                    setNewExpiry(opt.d);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${active ? "bg-[#10B981] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustom((v) => !v)}
              className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${showCustom ? "bg-[#10B981] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Date précise
            </button>
          </div>
        </div>

        {showCustom && (
          <input
            type="text"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            placeholder="JJ/MM/AAAA"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 outline-none focus:border-[#10B981] transition-colors"
          />
        )}

        {localErr && <p className="text-red-500 text-sm font-semibold">{localErr}</p>}

        <button
          onClick={submit}
          disabled={creating}
          className="flex items-center justify-center gap-2 w-full bg-[#10B981] hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
        >
          <Plus size={18} />
          {creating ? "Création..." : "Créer un code"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// CodeList
// ==========================================
export function CodeList({
  codes,
  loading,
  onToggle,
}: {
  codes: any[];
  loading: boolean;
  onToggle: (item: any) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Codes générés ({codes.length})</h3>
      
      {loading && codes.length === 0 ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun code généré pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {codes.map((item) => {
            const expired = item.expires_at && new Date(item.expires_at) <= new Date();
            return (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm p-4 flex flex-row items-center gap-3 border-l-4 ${item.active ? "border-[#10B981]" : "border-gray-300"}`}>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-lg font-black text-gray-900 font-mono tracking-wider">{item.code}</span>
                  <span className="text-sm text-gray-500 mt-1">
                    {item.label ? `${item.label} · ` : ""}
                    {item.usage_count} utilisation{item.usage_count > 1 ? "s" : ""}
                    {item.max_uses ? ` / ${item.max_uses}` : ""}
                  </span>
                  <span className={`text-xs font-semibold mt-1 ${expired ? "text-red-500" : "text-gray-400"}`}>
                    {item.expires_at
                      ? expired
                        ? "Expiré"
                        : `Expire le ${new Date(item.expires_at).toLocaleDateString("fr-FR")}`
                      : "N'expire jamais"}
                  </span>
                </div>
                
                <div className={`px-2 py-1 rounded text-xs font-bold ${item.active ? "bg-green-50 text-[#10B981]" : "bg-gray-100 text-gray-500"}`}>
                  {item.active ? "Actif" : "Désactivé"}
                </div>
                
                <button
                  onClick={() => onToggle(item)}
                  className="p-2 -mr-2"
                >
                  {item.active ? (
                    <XCircle size={24} className="text-red-400 hover:text-red-500 transition-colors" />
                  ) : (
                    <CheckCircle size={24} className="text-[#10B981] hover:text-green-600 transition-colors" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
