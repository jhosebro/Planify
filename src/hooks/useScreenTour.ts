import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'planify_tour_seen_';

/**
 * Manages the "have I seen this screen's tour?" state.
 *
 * - `visible`      — whether the tour modal should be shown right now
 * - `openTour`     — call this from the ? button to open it manually
 * - `closeTour`    — call this when the user dismisses or finishes the tour
 */
export function useScreenTour(screenKey: string) {
  const storageKey = `${PREFIX}${screenKey}`;
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // On mount, check whether the user has already seen this screen's tour
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((value) => {
      if (value !== 'true') {
        // First visit — show automatically
        setVisible(true);
      }
      setHydrated(true);
    }).catch(() => {
      setHydrated(true);
    });
  }, [storageKey]);

  const openTour = useCallback(() => {
    setVisible(true);
  }, []);

  const closeTour = useCallback(() => {
    setVisible(false);
    // Mark as seen so it won't auto-open next time
    AsyncStorage.setItem(storageKey, 'true').catch(() => {});
  }, [storageKey]);

  return { visible, hydrated, openTour, closeTour };
}
