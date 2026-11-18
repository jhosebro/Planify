import { renderHook } from '@testing-library/react-native';
import { useScreenTour } from '@/hooks/useScreenTour';
import { useTourStore } from '@/store/tourStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('true'),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
// Sin NavigationContainer: el foco se simula como un efecto normal
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));

it('el blur tardío de la pantalla anterior no borra la guía de la nueva', async () => {
  const a = await renderHook(() => useScreenTour('a'));
  const b = await renderHook(() => useScreenTour('b'));
  await a.unmount(); // A pierde el foco después de que B lo ganó
  expect(useTourStore.getState().openCurrentTour).toBe(b.result.current.openTour);
});
