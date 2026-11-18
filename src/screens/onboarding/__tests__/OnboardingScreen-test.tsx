import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';

const mockComplete = jest.fn().mockResolvedValue(undefined);
jest.mock('@/store/authStore', () => {
  const state = { userId: 'u1', completeOnboarding: () => mockComplete() };
  const useAuthStore = (sel: (s: typeof state) => unknown) => sel(state);
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

const mockProfile = { get: jest.fn(), update: jest.fn() };
jest.mock('@/services/profile/profileService', () => ({
  ProfileService: jest.fn(() => mockProfile),
}));

let mockAccountCount = 0;
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: mockAccountCount }) }) }),
  },
}));

// lucide-react-native se publica como ESM y jest no lo transforma; los íconos no importan aquí
jest.mock('@/components/AppIcon', () => ({ AppIcon: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAccountCount = 0;
  mockProfile.get.mockResolvedValue({ displayName: null });
  mockProfile.update.mockResolvedValue(undefined);
});

async function goToLastSlide() {
  await render(<OnboardingScreen />);
  for (let i = 0; i < 4; i++) await fireEvent.press(await screen.findByLabelText('Siguiente'));
  return screen.findByLabelText('Empezar a usar Planify');
}

describe('OnboardingScreen', () => {
  it('un usuario que ya tiene perfil lo salta sin ver los slides', async () => {
    mockProfile.get.mockResolvedValue({ displayName: 'Ana' });
    await render(<OnboardingScreen />);
    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
  });

  it('un usuario con cuentas creadas también lo salta', async () => {
    mockAccountCount = 2;
    await render(<OnboardingScreen />);
    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
  });

  it('un usuario nuevo ve la bienvenida y puede saltar', async () => {
    await render(<OnboardingScreen />);
    expect(await screen.findByText('Tu dinero, claro y en un solo lugar')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Saltar introducción'));
    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
    expect(mockProfile.update).not.toHaveBeenCalled();
  });

  it('al final guarda nombre y moneda y termina', async () => {
    const start = await goToLastSlide();
    expect(screen.queryByLabelText('Saltar introducción')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Nombre o apodo'), '  Ana  ');
    await fireEvent.press(screen.getByLabelText('Moneda USD'));
    await fireEvent.press(start);
    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
    expect(mockProfile.update).toHaveBeenCalledWith({ displayName: 'Ana', currency: 'USD' });
  });

  it('si guardar el perfil falla, igual termina el onboarding', async () => {
    mockProfile.update.mockRejectedValue(new Error('offline'));
    await fireEvent.press(await goToLastSlide());
    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
  });
});
