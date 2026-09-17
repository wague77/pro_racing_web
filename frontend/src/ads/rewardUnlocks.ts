import { storage } from "@/src/utils/storage";

// Persiste les pronostics débloqués via pub récompensée (clé = courseKey).
// Stockage sous forme de chaîne "k1,k2,..." (storage ne gère que des primitives).
const KEY = "rewarded_pronostics";

export async function isPronoUnlocked(courseKey: string): Promise<boolean> {
  const raw = await storage.getItem<string>(KEY, "");
  return raw ? raw.split(",").includes(courseKey) : false;
}

export async function unlockProno(courseKey: string): Promise<void> {
  const raw = await storage.getItem<string>(KEY, "");
  const list = raw ? raw.split(",").filter(Boolean) : [];
  if (!list.includes(courseKey)) list.push(courseKey);
  await storage.setItem(KEY, list.join(","));
}

// ---- Limite quotidienne de vidéos récompensées ----
const COUNT_KEY = "rewarded_count";
export const REWARDED_DAILY_LIMIT = 5;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Nombre de vidéos récompensées déjà consommées aujourd'hui (remis à 0 chaque jour).
export async function getRewardedToday(): Promise<number> {
  const raw = await storage.getItem<string>(COUNT_KEY, "");
  if (!raw) return 0;
  const idx = raw.indexOf(":");
  if (idx < 0) return 0;
  const day = raw.slice(0, idx);
  const n = parseInt(raw.slice(idx + 1), 10);
  return day === todayStr() ? (Number.isFinite(n) ? n : 0) : 0;
}

export async function incrementRewardedToday(): Promise<number> {
  const next = (await getRewardedToday()) + 1;
  await storage.setItem(COUNT_KEY, `${todayStr()}:${next}`);
  return next;
}


################################################################################
