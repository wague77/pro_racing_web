import dayjs from "dayjs";
import "dayjs/locale/fr";
import customParseFormat from "dayjs/plugin/customParseFormat";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
dayjs.locale("fr");

export const fmtGains = (cents?: number | null) => {
  if (cents == null) return "—";
  const euros = Math.round(cents / 100);
  return `${euros.toLocaleString("fr-FR")} €`;
};

export const fmtHeure = (ms?: number | null) => {
  if (!ms) return "";
  return dayjs(ms).format("HH:mm");
};

export const fmtDistance = (m?: number | null) => (m ? `${m.toLocaleString("fr-FR")} m` : "");

export const disciplineLabel = (d?: string, s?: string) => {
  const map: Record<string, string> = {
    ATTELE: "Trot attelé",
    MONTE: "Trot monté",
    PLAT: "Plat",
    OBSTACLE: "Obstacle",
    HAIES: "Haies",
    STEEPLECHASE: "Steeple",
  };
  return map[s || ""] || map[d || ""] || (s || d || "").replace(/_/g, " ");
};

export const sexeLabel = (s?: string) => {
  const map: Record<string, string> = {
    MALES: "Mâle",
    FEMELLES: "Femelle",
    HONGRES: "Hongre",
  };
  return map[s || ""] || s || "";
};

// Build a DDMMYYYY key for the PMU API from a dayjs date
export const apiDate = (d: dayjs.Dayjs) => d.format("DDMMYYYY");

export const dateLabel = (d: dayjs.Dayjs) => {
  const today = dayjs().startOf("day");
  const diff = d.startOf("day").diff(today, "day");
  if (diff === 0) return "Auj.";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  return d.format("ddd D").replace(".", "");
};

// Détecte la course support du Quinté+ (présent aussi dans l'historique PMU).
export const isQuintePlus = (course: any): boolean => {
  if (!course) return false;
  if (course.quinte === true) return true; // booléen calculé côté backend
  const paris = course.paris;
  if (!Array.isArray(paris)) return false;
  return paris.some((p: any) => {
    const t = String((p && (p.typePari || p.type)) ?? p ?? "").toUpperCase();
    return t.includes("QUINTE_PLUS") || t === "QUINTE+";
  });
};


################################################################################
