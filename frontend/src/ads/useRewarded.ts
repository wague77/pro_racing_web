import { useCallback } from "react";
import { hasAds, ads, rewardedUnitId } from "@/src/ads/ads";

// Affiche une annonce vidéo récompensée à la demande.
// Résout `true` si l'utilisateur a gagné la récompense, `false` sinon.
// No-op (résout false) sur web / Expo Go où AdMob est absent.
export function useRewarded() {
  const showRewarded = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!hasAds) {
        resolve(false);
        return;
      }
      const { RewardedAd, RewardedAdEventType, AdEventType } = ads;
      const rewarded = RewardedAd.createForAdRequest(rewardedUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const subs: (() => void)[] = [];
      let earned = false;
      let settled = false;

      const cleanup = () => {
        subs.forEach((u) => {
          try {
            u();
          } catch {
            /* ignore */
          }
        });
      };
      const finish = (val: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(val);
      };

      subs.push(
        rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          try {
            rewarded.show();
          } catch {
            finish(false);
          }
        })
      );
      subs.push(
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        })
      );
      subs.push(
        rewarded.addAdEventListener(AdEventType.CLOSED, () => {
          finish(earned);
        })
      );
      subs.push(
        rewarded.addAdEventListener(AdEventType.ERROR, () => {
          finish(false);
        })
      );

      try {
        rewarded.load();
      } catch {
        finish(false);
      }
    });
  }, []);

  return { showRewarded };
}


################################################################################
