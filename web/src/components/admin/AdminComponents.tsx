"use client";

import React, { useState } from "react";
import dayjs from "dayjs";
import { Plus, Minus, Smartphone, MonitorSmartphone } from "lucide-react";

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
      <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Appareils connectés ({stats.count})</h3>
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

