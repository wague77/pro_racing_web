"use client";

const K_HORSES = "fav_horses";
const K_COURSES = "fav_courses";

export type FavHorse = {
  key: string;
  numPmu: number;
  nom: string;
  driver?: string;
  cote?: number | null;
  musique?: string | null;
  date: string;
  r: number;
  c: number;
  hippodrome?: string;
  participant: any;
};

export type FavCourse = {
  key: string;
  date: string;
  r: number;
  c: number;
  libelle: string;
  hippodrome?: string;
  discipline?: string;
  distance?: number;
  heureDepart?: number;
};

export const horseKey = (date: string, r: number, c: number, num: number) =>
  `${date}-R${r}-C${c}-${num}`;
export const courseKey = (date: string, r: number, c: number) => `${date}-R${r}-C${c}`;

function readArr<T>(k: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(k);
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeArr<T>(k: string, arr: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(arr));
}

export const favorites = {
  getHorses() {
    return readArr<FavHorse>(K_HORSES);
  },
  getCourses() {
    return readArr<FavCourse>(K_COURSES);
  },
  toggleHorse(item: FavHorse) {
    const arr = readArr<FavHorse>(K_HORSES);
    const idx = arr.findIndex((x) => x.key === item.key);
    let added: boolean;
    if (idx >= 0) {
      arr.splice(idx, 1);
      added = false;
    } else {
      arr.unshift(item);
      added = true;
    }
    writeArr(K_HORSES, arr);
    return added;
  },
  toggleCourse(item: FavCourse) {
    const arr = readArr<FavCourse>(K_COURSES);
    const idx = arr.findIndex((x) => x.key === item.key);
    let added: boolean;
    if (idx >= 0) {
      arr.splice(idx, 1);
      added = false;
    } else {
      arr.unshift(item);
      added = true;
    }
    writeArr(K_COURSES, arr);
    return added;
  },
  isHorse(key: string) {
    const arr = readArr<FavHorse>(K_HORSES);
    return arr.some((x) => x.key === key);
  },
  isCourse(key: string) {
    const arr = readArr<FavCourse>(K_COURSES);
    return arr.some((x) => x.key === key);
  },
};
