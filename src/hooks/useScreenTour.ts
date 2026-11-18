import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTourStore } from '@/store/tourStore';

const PREFIX = 'planify_tour_seen_';
/** Apaga la apertura automática de todas las guías; el botón ? sigue funcionando. */
const ALL_DISABLED_KEY = 'planify_tours_disabled';

/**
 * Manages the "have I seen this screen's tour?" state.
 *
 * - `visible`      — whether the tour modal should be shown right now
 * - `openTour`     — call this to open it manually (also wired to the header ? button)
 * - `closeTour`    — call this when the user dismisses or finishes the tour
 */
export function useScreenTour(screenKey: string) {
  const storageKey = `${PREFIX}${screenKey}`;
  const [visible, setVisible] = useState(false);
  const registerTour = useTourStore((s) => s.registerTour);
  const unregisterTour = useTourStore((s) => s.unregisterTour);

  const openTour = useCallback(() => setVisible(true), []);

  const closeTour = useCallback((disableAll = false) => {
    setVisible(false);
    AsyncStorage.setItem(storageKey, 'true').catch(() => {});
    if (disableAll) AsyncStorage.setItem(ALL_DISABLED_KEY, 'true').catch(() => {});
  }, [storageKey]);

  // Auto-open on first visit
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(storageKey), AsyncStorage.getItem(ALL_DISABLED_KEY)]).then(([seen, allDisabled]) => {
      if (seen !== 'true' && allDisabled !== 'true') setVisible(true);
    }).catch(() => {});
  }, [storageKey]);

  // Register openTour in the global store while this screen is focused
  // so the header ? button can call it without prop drilling
  useFocusEffect(
    useCallback(() => {
      registerTour(openTour);
      // El blur de la pantalla anterior puede llegar después del focus de la nueva: no borrar el registro ajeno
      return () => {
        if (useTourStore.getState().openCurrentTour === openTour) unregisterTour();
      };
    }, [openTour, registerTour, unregisterTour])
  );

  return { visible, openTour, closeTour };
}
