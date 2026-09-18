"use client";

import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield, Users, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";

type ChartItem = {
  date: string;
  success: number;
  failed: number;
  blocked: number;
};

export default function AuditDashboard({ auditData, busy }: { auditData: any; busy: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (busy && !auditData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3 text-sm text-gray-500 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Chargement des journaux de sécurité et statistiques...</span>
        </div>
      </div>
    );
  }

  if (!auditData) return null;

  const recent_logs: any[] = Array.isArray(auditData?.recent_logs) ? auditData.recent_logs : [];
  const chart_data: ChartItem[] = Array.isArray(auditData?.chart_data) ? auditData.chart_data : [];

  const formatXAxis = (tickItem: string) => {
    if (!tickItem) return "";
    try {
      return format(parseISO(tickItem), "dd MMM", { locale: fr });
    } catch {
      return tickItem;
    }
  };

  const formatLogTime = (ts: string) => {
    if (!ts) return "N/A";
    try {
      return format(parseISO(ts), "dd/MM HH:mm:ss");
    } catch {
      return ts;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full text-xs font-semibold">
            <CheckCircle2 size={12} className="text-emerald-500" /> Succès
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200/60 px-2 py-0.5 rounded-full text-xs font-semibold">
            <XCircle size={12} className="text-red-500" /> Échec
          </span>
        );
      case "blocked":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full text-xs font-semibold">
            <AlertCircle size={12} className="text-amber-500" /> Bloqué
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  // SVG Chart calculation
  const maxVal = Math.max(
    5,
    ...chart_data.map((d) => Math.max(d.success || 0, d.failed || 0, d.blocked || 0))
  );

  const chartWidth = 600;
  const chartHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const pointsCount = Math.max(chart_data.length, 1);
  const getX = (i: number) => padLeft + (pointsCount > 1 ? (i / (pointsCount - 1)) * innerW : innerW / 2);
  const getY = (val: number) => padTop + innerH - (val / maxVal) * innerH;

  const successPoints = chart_data.map((d, i) => `${getX(i)},${getY(d.success || 0)}`).join(" ");
  const failedPoints = chart_data.map((d, i) => `${getX(i)},${getY(d.failed || 0)}`).join(" ");
  const blockedPoints = chart_data.map((d, i) => `${getX(i)},${getY(d.blocked || 0)}`).join(" ");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">Activité & Sécurité</h3>
            <p className="text-xs text-gray-500">Statistiques de connexion des 7 derniers jours</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Succès
          </div>
          <div className="flex items-center gap-1.5 text-red-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Échecs
          </div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bloqués
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="mb-6">
        {chart_data.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
            <Info size={24} className="mb-1 text-gray-300" />
            <span>Aucune donnée de connexion enregistrée pour cette période.</span>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden bg-gray-50/50 rounded-xl p-2 border border-gray-100">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padTop + innerH * (1 - ratio);
                const labelVal = Math.round(maxVal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#9CA3AF"
                      fontWeight="bold"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Lines */}
              {chart_data.length > 1 && (
                <>
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={successPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={failedPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={blockedPoints}
                  />
                </>
              )}

              {/* Data points & X Axis labels */}
              {chart_data.map((d, i) => {
                const cx = getX(i);
                const isHovered = hoveredIdx === i;

                return (
                  <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                    {/* Hover vertical bar */}
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={padTop}
                        x2={cx}
                        y2={padTop + innerH}
                        stroke="#9CA3AF"
                        strokeDasharray="2 2"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Success dot */}
                    <circle
                      cx={cx}
                      cy={getY(d.success || 0)}
                      r={isHovered ? 6 : 4}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />

                    {/* Failed dot */}
                    <circle
                      cx={cx}
                      cy={getY(d.failed || 0)}
                      r={isHovered ? 5 : 3.5}
                      fill="#EF4444"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />

                    {/* Blocked dot */}
                    <circle
                      cx={cx}
                      cy={getY(d.blocked || 0)}
                      r={isHovered ? 5 : 3.5}
                      fill="#F59E0B"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />

                    {/* X-axis date label */}
                    <text
                      x={cx}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? "bold" : "normal"}
                      fill={isHovered ? "#111827" : "#6B7280"}
                    >
                      {formatXAxis(d.date)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover tooltip card */}
            {hoveredIdx !== null && chart_data[hoveredIdx] && (
              <div className="absolute top-3 right-3 bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg flex flex-col gap-1 pointer-events-none z-10 border border-gray-700">
                <span className="font-bold text-gray-300">
                  {formatXAxis(chart_data[hoveredIdx].date)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400">Succès: {chart_data[hoveredIdx].success || 0}</span>
                  <span className="text-red-400">Échecs: {chart_data[hoveredIdx].failed || 0}</span>
                  <span className="text-amber-400">Bloqués: {chart_data[hoveredIdx].blocked || 0}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div>
        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Dernières connexions & événements</h4>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-extrabold tracking-wider">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Code / ID</th>
                <th className="px-3 py-2.5">IP</th>
                <th className="px-3 py-2.5">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent_logs.map((log: any, idx: number) => (
                <tr key={log._id || idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">
                    {formatLogTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-2">{getStatusBadge(log.status)}</td>
                  <td className="px-3 py-2 font-medium">
                    {log.action === "admin_login"
                      ? "Connexion Admin"
                      : log.action === "user_login"
                      ? "Connexion Client"
                      : log.action || "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] font-bold text-gray-700">{log.code || "-"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{log.ip || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 truncate max-w-[200px]" title={log.details}>
                    {log.details || "-"}
                  </td>
                </tr>
              ))}
              {recent_logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Aucun événement de sécurité récent enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
