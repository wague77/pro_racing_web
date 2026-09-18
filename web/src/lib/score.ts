export interface ScoreData {
  musique?: string;
  gainsCarriere?: number;
  gainsAnneeEnCours?: number;
  cote?: number;
}

export function calculerScore(data: ScoreData): number {
  let score = 50; // Base score

  // 1. Analyse de la musique (historique des places)
  if (data.musique && typeof data.musique === 'string') {
    const parts = data.musique.match(/([0-9DTA]+[A-Z])/g) || [];
    let musiqueScore = 0;
    
    parts.slice(0, 5).forEach((p, i) => {
      // Poids décroissant pour les courses plus anciennes
      const weight = 5 - i; 
      
      if (p.includes('1')) musiqueScore += 4 * weight;
      else if (p.includes('2') || p.includes('3')) musiqueScore += 2.5 * weight;
      else if (p.includes('4') || p.includes('5')) musiqueScore += 1 * weight;
      else if (p.includes('D') || p.includes('A') || p.includes('T')) musiqueScore -= 2 * weight;
    });

    // Normaliser l'impact de la musique entre -15 et +25
    score += Math.max(-15, Math.min(25, musiqueScore));
  }

  // 2. Analyse des gains de l'année
  if (data.gainsAnneeEnCours) {
    // Si le cheval a gagné plus de 50 000€ cette année, on lui donne un bonus
    if (data.gainsAnneeEnCours > 10000000) score += 15; // > 100 000€
    else if (data.gainsAnneeEnCours > 5000000) score += 10; // > 50 000€
    else if (data.gainsAnneeEnCours > 2000000) score += 5; // > 20 000€
  }

  // 3. Analyse de la cote (confiance des parieurs)
  if (data.cote && data.cote > 0) {
    if (data.cote <= 3) score += 15;
    else if (data.cote <= 8) score += 10;
    else if (data.cote <= 15) score += 5;
    else if (data.cote >= 30) score -= 10;
    else if (data.cote >= 50) score -= 15;
  }

  // S'assurer que le score reste entre 0 et 100
  return Math.round(Math.max(0, Math.min(100, score)));
}
