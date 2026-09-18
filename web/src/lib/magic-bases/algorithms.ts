export const PRIX_TIERCE = 6;
export const PRIX_COUPLE = 10;
export const PRIX_TIERCE_G = 6;
export const PRIX_QUINTE_G = 25;

export function taillePartenaires(partants: number): number {
  return partants <= 18 ? 7 : 8;
}

export function partenairesAuto(base: number, partants: number, combien?: number): number[] {
  let s = (base * 7919 + partants * 104729 + 17) >>> 0;
  function nextRandom() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  const pool = [];
  for (let i = 1; i <= partants; i++) {
    if (i !== base) pool.push(i);
  }

  // Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const limit = combien || taillePartenaires(partants);
  return pool.slice(0, limit).sort((a, b) => a - b);
}

export function fmtPct(n: number): string {
  return n.toFixed(1).replace(".", ",") + " %";
}

function genererPaires(arr: number[]): [number, number][] {
  const paires: [number, number][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      paires.push([arr[i], arr[j]]);
    }
  }
  return paires;
}

function genererQuatuors(arr: number[]): number[][] {
  const quatuors: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      for (let k = j + 1; k < arr.length; k++) {
        for (let l = k + 1; l < arr.length; l++) {
          quatuors.push([arr[i], arr[j], arr[k], arr[l]]);
        }
      }
    }
  }
  return quatuors;
}

function partitionner<T>(arr: T[]): [T[], T[], T[]] {
  const partSize = Math.ceil(arr.length / 3);
  return [
    arr.slice(0, partSize),
    arr.slice(partSize, partSize * 2),
    arr.slice(partSize * 2)
  ];
}

export interface GrilleResult {
  partenaires: number[];
  outsiders: number[];
  tierces: { a: number[][]; b: number[][]; c: number[][] };
  couples: { a: number[][]; b: number[][]; c: number[][] };
  couts: { a: number; ab: number; abc: number };
  garanties: { a: number; ab: number; abc: number };
}

export function construireGrille(
  base: number,
  partants: number,
  partenairesChoisis?: number[]
): GrilleResult {
  const limit = taillePartenaires(partants);
  let partenaires = partenairesChoisis && partenairesChoisis.length >= 2 
    ? partenairesChoisis.slice(0, limit).sort((a, b) => a - b)
    : partenairesAuto(base, partants, limit);

  const outsiders = [];
  for (let i = 1; i <= partants; i++) {
    if (i !== base && !partenaires.includes(i)) {
      outsiders.push(i);
    }
  }

  const paires = genererPaires(partenaires);
  const [ta, tb, tc] = partitionner(paires.map(p => [base, p[0], p[1]].sort((a, b) => a - b)));

  let ca: number[][] = [];
  let cb: number[][] = [];
  let cc: number[][] = [];

  outsiders.forEach(out => {
    ca.push([base, out].sort((a, b) => a - b));
    ca.push([base, out].sort((a, b) => a - b));
    cb.push([base, out].sort((a, b) => a - b));
    cb.push([base, out].sort((a, b) => a - b));
    cb.push([base, out].sort((a, b) => a - b));
    // The prompt says: 2 couplés JEU A, 3 JEU B, le reste JEU C.
    // However, it doesn't specify how many is "the rest". Usually there is a logic.
    // For now, I'll put 5 in C just to have 10 total like some manual systems do.
    for (let i = 0; i < 5; i++) cc.push([base, out].sort((a, b) => a - b));
  });

  const costA = ta.length * PRIX_TIERCE + ca.length * PRIX_COUPLE;
  const costB = tb.length * PRIX_TIERCE + cb.length * PRIX_COUPLE;
  const costC = tc.length * PRIX_TIERCE + cc.length * PRIX_COUPLE;

  // Calcul de garantie : paires d'autres chevaux couvertes
  const autres = [];
  for (let i = 1; i <= partants; i++) {
    if (i !== base) autres.push(i);
  }
  const allPaires = genererPaires(autres);
  const total = allPaires.length || 1;

  function calcGarantie(tierces: number[][], couples: number[][]) {
    // Une paire (x, y) est couverte si un tiercé contient (base, x, y)
    // OU si un couplé contient (base, x) ou (base, y)
    let couvert = 0;
    
    const chevauxCouples = new Set(couples.flatMap(c => c).filter(x => x !== base));
    const pairesTierces = new Set(tierces.map(t => {
      const p = t.filter(x => x !== base);
      return `${Math.min(p[0], p[1])}-${Math.max(p[0], p[1])}`;
    }));

    allPaires.forEach(([x, y]) => {
      const px = Math.min(x, y);
      const py = Math.max(x, y);
      if (chevauxCouples.has(x) || chevauxCouples.has(y)) {
        couvert++;
      } else if (pairesTierces.has(`${px}-${py}`)) {
        couvert++;
      }
    });
    return (couvert / total) * 100;
  }

  const tiercesAB = [...ta, ...tb];
  const couplesAB = [...ca, ...cb];
  const tiercesABC = [...tiercesAB, ...tc];
  const couplesABC = [...couplesAB, ...cc];

  return {
    partenaires,
    outsiders,
    tierces: { a: ta, b: tb, c: tc },
    couples: { a: ca, b: cb, c: cc },
    couts: { a: costA, ab: costA + costB, abc: costA + costB + costC },
    garanties: {
      a: calcGarantie(ta, ca),
      ab: calcGarantie(tiercesAB, couplesAB),
      abc: calcGarantie(tiercesABC, couplesABC)
    }
  };
}

export interface GrilleGarantieResult {
  partenaires: number[];
  tierces: { a: number[][]; b: number[][]; c: number[][] };
  quintes: { a: number[][]; b: number[][]; c: number[][] };
  couts: { a: number; ab: number; abc: number };
  garantiesT: { a: number; ab: number; abc: number };
  garantiesQ: { a: number; ab: number; abc: number };
}

export function construireGrilleGarantie(
  base: number,
  partants: number,
  combien: number,
  associesChoisis?: number[]
): GrilleGarantieResult {
  const limit = Math.min(Math.max(combien, 6), 10);
  let partenaires = associesChoisis && associesChoisis.length >= 4
    ? associesChoisis.slice(0, limit).sort((a, b) => a - b)
    : partenairesAuto(base, partants, limit);

  const paires = genererPaires(partenaires);
  const quatuors = genererQuatuors(partenaires);

  const [ta, tb, tc] = partitionner(paires.map(p => [base, p[0], p[1]].sort((a, b) => a - b)));
  const [qa, qb, qc] = partitionner(quatuors.map(q => [base, ...q].sort((a, b) => a - b)));

  const costA = ta.length * PRIX_TIERCE_G + qa.length * PRIX_QUINTE_G;
  const costB = tb.length * PRIX_TIERCE_G + qb.length * PRIX_QUINTE_G;
  const costC = tc.length * PRIX_TIERCE_G + qc.length * PRIX_QUINTE_G;

  const totalT = paires.length || 1;
  const totalQ = quatuors.length || 1;

  const gTa = (ta.length / totalT) * 100;
  const gTab = ((ta.length + tb.length) / totalT) * 100;
  const gTabc = ((ta.length + tb.length + tc.length) / totalT) * 100;

  const gQa = (qa.length / totalQ) * 100;
  const gQab = ((qa.length + qb.length) / totalQ) * 100;
  const gQabc = ((qa.length + qb.length + qc.length) / totalQ) * 100;

  return {
    partenaires,
    tierces: { a: ta, b: tb, c: tc },
    quintes: { a: qa, b: qb, c: qc },
    couts: { a: costA, ab: costA + costB, abc: costA + costB + costC },
    garantiesT: { a: gTa, ab: gTab, abc: gTabc },
    garantiesQ: { a: gQa, ab: gQab, abc: gQabc }
  };
}
