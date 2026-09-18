import React from "react";

export function FreeAccessControl({
  state,
  busy,
  onToggle,
}: {
  state: { active: boolean; expires_at: string | null } | null;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-extrabold text-gray-900 text-base">Accès public gratuit</h4>
        <p className="text-sm text-gray-500 mt-1 flex flex-col">
          <span>{state?.active ? "Le mode démo est actuellement activé." : "Le mode démo est désactivé."}</span>
          {state?.active && (
            <span className="font-bold text-[#10B981]">
              Date d'expiration : {state.expires_at ? new Date(state.expires_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Illimité"}
            </span>
          )}
        </p>
      </div>
      <button
        disabled={busy}
        onClick={onToggle}
        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
          state?.active
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-[#10B981] text-white hover:bg-green-600"
        } ${busy ? "opacity-50" : ""}`}
      >
        {state?.active ? "Désactiver" : "Activer"}
      </button>
    </div>
  );
}
