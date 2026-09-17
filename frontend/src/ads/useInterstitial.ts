import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/src/auth";
import { hasAds, ads, interstitialUnitId } from "@/src/ads/ads";

// Interstitiel affiché à l'ouverture d'une course, 1 fois sur 3, en mode démo seulement.
const SHOW_EVERY = 3;

export function useInterstitial() {
  const { isDemo } = useAuth();
  const adRef = useRef<any>(null);
  const loadedRef = useRef(false);
  const countRef = useRef(0);

  useEffect(() => {
    if (!isDemo || !hasAds) return;
    const { InterstitialAd, AdEventType } = ads;
    const interstitial = InterstitialAd.createForAdRequest(interstitialUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = interstitial;
    const un1 = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    const un2 = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
      interstitial.load();
    });
    interstitial.load();
    return () => {
      un1();
      un2();
    };
  }, [isDemo]);

  // À appeler à l'ouverture d'une course.
  const maybeShow = useCallback(() => {
    if (!isDemo || !hasAds) return;
    countRef.current += 1;
    if (countRef.current % SHOW_EVERY === 0 && loadedRef.current && adRef.current) {
      try {
        adRef.current.show();
      } catch {
        /* ignore */
      }
    }
  }, [isDemo]);

  return { maybeShow };
}


################################################################################
