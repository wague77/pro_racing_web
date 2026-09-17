"use client";

const KEY = "rewarded_pronostics";
const COUNT_KEY = "rewarded_count";
export const REWARDED_DAILY_LIMIT = 5;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isPronoUnlocked(courseKey: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(KEY) || "";
  return raw ? raw.split(",").includes(courseKey) : false;
}

export function unlockProno(courseKey: string): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEY) || "";
  const list = raw ? raw.split(",").filter(Boolean) : [];
  if (!list.includes(courseKey)) list.push(courseKey);
  localStorage.setItem(KEY, list.join(","));
}

export function getRewardedToday(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(COUNT_KEY) || "";
  if (!raw) return 0;
  const idx = raw.indexOf(":");
  if (idx < 0) return 0;
  const day = raw.slice(0, idx);
  const n = parseInt(raw.slice(idx + 1), 10);
  return day === todayStr() ? (Number.isFinite(n) ? n : 0) : 0;
}

export function incrementRewardedToday(): number {
  if (typeof window === "undefined") return 1;
  const next = getRewardedToday() + 1;
  localStorage.setItem(COUNT_KEY, `${todayStr()}:${next}`);
  return next;
}
