"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function AuditDashboard({ auditData, busy }: { auditData: any; busy: boolean }) {
  if (busy && !auditData) {
    return <div className="text-sm text-gray-500 animate-pulse">Chargement des statistiques...</div>;
  }
  if (!auditData) return null;

  const recent_logs = auditData.recent_logs || [];
  const chart_data = auditData.chart_data || [];
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
      case "success": return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Succès</span>;
      case "failed": return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Échec</span>;
      case "blocked": return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">Bloqué</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Activité & Sécurité</h2>
      
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Connexions (7 derniers jours)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
              <Tooltip 
                labelFormatter={(label) => {
                  try { return format(parseISO(label), "dd MMMM yyyy", { locale: fr }); }
                  catch { return label; }
                }}
              />
              <Legend />
              <Line type="monotone" name="Succès" dataKey="success" stroke="#10B981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" name="Échecs" dataKey="failed" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" name="Bloqués" dataKey="blocked" stroke="#F59E0B" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Derniers événements</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Code / ID</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent_logs.map((log: any) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatLogTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                  <td className="px-4 py-3">{log.action === "admin_login" ? "Connexion Admin" : log.action === "user_login" ? "Connexion Client" : log.action}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.code || "-"}</td>
                  <td className="px-4 py-3 text-xs">{log.ip}</td>
                  <td className="px-4 py-3 text-xs">{log.details || "-"}</td>
                </tr>
              ))}
              {recent_logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucun événement récent.
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
