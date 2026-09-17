// Stub Web : AdMob n'existe pas sur le web. Metro charge ce fichier à la place de ads.ts.
export const ADMOB = {
  banner: "ca-app-pub-5323776981488004/7848516068",
  interstitial: "ca-app-pub-5323776981488004/3802258601",
  rewarded: "ca-app-pub-5323776981488004/5325197025",
};

export const hasAds = false;
export const ads: any = null;

export async function initAds() {
  /* no-op sur web */
}

export const bannerUnitId = ADMOB.banner;
export const interstitialUnitId = ADMOB.interstitial;
export const rewardedUnitId = ADMOB.rewarded;


################################################################################
