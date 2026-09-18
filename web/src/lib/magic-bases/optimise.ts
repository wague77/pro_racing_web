export type PariOptimise = "tierce" | "quinte" | "couple-place" | "couple-gagnant";

interface OptimiseLine {
  chances: number;
  bornes: number[][]; // [min, max] pour chaque indice
}

// Bornes Tiercé (min de 6 à 11 selon l'indice, max décalé vers le haut à chaque ligne)
// Lignes: 47, 53, 58, 63, 68, 71, 75, 78, 82, 84, 85, 87, 89, 89, 92, 93, 95, 95
const lignesTierce: OptimiseLine[] = [
  { chances: 47, bornes: [[6,13],[7,14],[7,15],[8,16],[8,17],[9,18],[9,19],[10,20],[10,21],[11,22]] },
  { chances: 53, bornes: [[6,14],[7,15],[7,16],[8,17],[8,18],[9,19],[9,20],[10,21],[10,22],[11,23]] },
  { chances: 58, bornes: [[6,15],[7,16],[7,17],[8,18],[8,19],[9,20],[9,21],[10,22],[10,23],[11,24]] },
  { chances: 63, bornes: [[6,16],[7,17],[7,18],[8,19],[8,20],[9,21],[9,22],[10,23],[10,24],[11,25]] },
  { chances: 68, bornes: [[6,17],[7,18],[7,19],[8,20],[8,21],[9,22],[9,23],[10,24],[10,25],[11,26]] },
  { chances: 71, bornes: [[6,18],[7,19],[7,20],[8,21],[8,22],[9,23],[9,24],[10,25],[10,26],[11,27]] },
  { chances: 75, bornes: [[6,19],[7,20],[7,21],[8,22],[8,23],[9,24],[9,25],[10,26],[10,27],[11,28]] },
  { chances: 78, bornes: [[6,20],[7,21],[7,22],[8,23],[8,24],[9,25],[9,26],[10,27],[10,28],[11,29]] },
  { chances: 82, bornes: [[6,21],[7,22],[7,23],[8,24],[8,25],[9,26],[9,27],[10,28],[10,29],[11,30]] },
  { chances: 84, bornes: [[6,22],[7,23],[7,24],[8,25],[8,26],[9,27],[9,28],[10,29],[10,30],[11,31]] },
  { chances: 85, bornes: [[6,23],[7,24],[7,25],[8,26],[8,27],[9,28],[9,29],[10,30],[10,31],[11,32]] },
  { chances: 87, bornes: [[6,24],[7,25],[7,26],[8,27],[8,28],[9,29],[9,30],[10,31],[10,32],[11,33]] },
  { chances: 89, bornes: [[6,25],[7,26],[7,27],[8,28],[8,29],[9,30],[9,31],[10,32],[10,33],[11,34]] },
  { chances: 89, bornes: [[6,26],[7,27],[7,28],[8,29],[8,30],[9,31],[9,32],[10,33],[10,34],[11,35]] },
  { chances: 92, bornes: [[6,28],[7,29],[7,30],[8,31],[8,32],[9,33],[9,34],[10,35],[10,36],[11,37]] },
  { chances: 93, bornes: [[6,30],[7,31],[7,32],[8,33],[8,34],[9,35],[9,36],[10,37],[10,38],[11,39]] },
  { chances: 95, bornes: [[6,32],[7,33],[7,34],[8,35],[8,36],[9,37],[9,38],[10,39],[10,40],[11,41]] },
  { chances: 95, bornes: [[6,34],[7,35],[7,36],[8,37],[8,38],[9,39],[9,40],[10,41],[10,42],[11,43]] },
];

// Bornes Quinté
// Lignes: 42, 47, 50, 55, 60, 62, 66, 70, 73, 77, 78, 80, 82, 84, 87, 89, 91, 92
const lignesQuinte: OptimiseLine[] = [
  { chances: 42, bornes: [[19,28],[20,29],[20,30],[21,31],[21,32],[22,33],[22,34],[23,35],[23,36],[24,37]] },
  { chances: 47, bornes: [[19,29],[20,30],[20,31],[21,32],[21,33],[22,34],[22,35],[23,36],[23,37],[24,38]] },
  { chances: 50, bornes: [[19,30],[20,31],[20,32],[21,33],[21,34],[22,35],[22,36],[23,37],[23,38],[24,39]] },
  { chances: 55, bornes: [[19,32],[20,33],[20,34],[21,35],[21,36],[22,37],[22,38],[23,39],[23,40],[24,41]] },
  { chances: 60, bornes: [[19,34],[20,35],[20,36],[21,37],[21,38],[22,39],[22,40],[23,41],[23,42],[24,43]] },
  { chances: 62, bornes: [[19,35],[20,36],[20,37],[21,38],[21,39],[22,40],[22,41],[23,42],[23,43],[24,44]] },
  { chances: 66, bornes: [[19,37],[20,38],[20,39],[21,40],[21,41],[22,42],[22,43],[23,44],[23,45],[24,46]] },
  { chances: 70, bornes: [[19,39],[20,40],[20,41],[21,42],[21,43],[22,44],[22,45],[23,46],[23,47],[24,48]] },
  { chances: 73, bornes: [[19,41],[20,42],[20,43],[21,44],[21,45],[22,46],[22,47],[23,48],[23,49],[24,50]] },
  { chances: 77, bornes: [[19,43],[20,44],[20,45],[21,46],[21,47],[22,48],[22,49],[23,50],[23,51],[24,52]] },
  { chances: 78, bornes: [[19,44],[20,45],[20,46],[21,47],[21,48],[22,49],[22,50],[23,51],[23,52],[24,53]] },
  { chances: 80, bornes: [[19,45],[20,46],[20,47],[21,48],[21,49],[22,50],[22,51],[23,52],[23,53],[24,54]] },
  { chances: 82, bornes: [[19,46],[20,47],[20,48],[21,49],[21,50],[22,51],[22,52],[23,53],[23,54],[24,55]] },
  { chances: 84, bornes: [[19,48],[20,49],[20,50],[21,51],[21,52],[22,53],[22,54],[23,55],[23,56],[24,57]] },
  { chances: 87, bornes: [[19,50],[20,51],[20,52],[21,53],[21,54],[22,55],[22,56],[23,57],[23,58],[24,59]] },
  { chances: 89, bornes: [[19,52],[20,53],[20,54],[21,55],[21,56],[22,57],[22,58],[23,59],[23,60],[24,61]] },
  { chances: 91, bornes: [[19,55],[20,56],[20,57],[21,58],[21,59],[22,60],[22,61],[23,62],[23,63],[24,64]] },
  { chances: 92, bornes: [[19,58],[20,59],[20,60],[21,61],[21,62],[22,63],[22,64],[23,65],[23,66],[24,67]] },
];

export function bornesOptimise(pari: PariOptimise, indice: number, ligne: number): [number, number] | null {
  if (indice < 1 || indice > 10) return null;
  const colIndex = Math.floor(indice - 1);
  
  if (pari === "tierce") {
    if (ligne < 0 || ligne >= lignesTierce.length) return null;
    return [lignesTierce[ligne].bornes[colIndex][0], lignesTierce[ligne].bornes[colIndex][1]];
  }
  
  if (pari === "quinte") {
    if (ligne < 0 || ligne >= lignesQuinte.length) return null;
    return [lignesQuinte[ligne].bornes[colIndex][0], lignesQuinte[ligne].bornes[colIndex][1]];
  }
  
  if (pari === "couple-place" || pari === "couple-gagnant") {
    // Pour les couplés, la demande spécifie seulement un maxi, pas de mini. On retourne [0, maxi]
    // Le maxi du couplé est calculé à la louche par rapport au tiercé: maxiTierce - 6
    if (ligne < 0 || ligne >= lignesTierce.length) return null;
    const maxiTierce = lignesTierce[ligne].bornes[colIndex][1];
    return [0, maxiTierce - 6];
  }
  
  return null;
}

export function getLignesChances(pari: PariOptimise): number[] {
  if (pari === "tierce" || pari === "couple-place" || pari === "couple-gagnant") {
    return lignesTierce.map(l => l.chances);
  } else {
    return lignesQuinte.map(l => l.chances);
  }
}
