import { storage } from "@/src/utils/storage";

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

async function readArr<T>(k: string): Promise<T[]> {
  const raw = await storage.getItem<string>(k, "[]");
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}
async function writeArr<T>(k: string, arr: T[]) {
  await storage.setItem(k, JSON.stringify(arr));
}

export const favorites = {
  async getHorses() {
    return readArr<FavHorse>(K_HORSES);
  },
  async getCourses() {
    return readArr<FavCourse>(K_COURSES);
  },
  async toggleHorse(item: FavHorse) {
    const arr = await readArr<FavHorse>(K_HORSES);
    const idx = arr.findIndex((x) => x.key === item.key);
    let added: boolean;
    if (idx >= 0) {
      arr.splice(idx, 1);
      added = false;
    } else {
      arr.unshift(item);
      added = true;
    }
    await writeArr(K_HORSES, arr);
    return added;
  },
  async toggleCourse(item: FavCourse) {
    const arr = await readArr<FavCourse>(K_COURSES);
    const idx = arr.findIndex((x) => x.key === item.key);
    let added: boolean;
    if (idx >= 0) {
      arr.splice(idx, 1);
      added = false;
    } else {
      arr.unshift(item);
      added = true;
    }
    await writeArr(K_COURSES, arr);
    return added;
  },
  async isHorse(key: string) {
    const arr = await readArr<FavHorse>(K_HORSES);
    return arr.some((x) => x.key === key);
  },
  async isCourse(key: string) {
    const arr = await readArr<FavCourse>(K_COURSES);
    return arr.some((x) => x.key === key);
  },
};


################################################################################
