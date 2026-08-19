import { create } from 'zustand';
import type { Profile } from '@/types';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
}

interface ProfileActions {
  setProfile: (profile: Profile) => void;
  setLoading: (loading: boolean) => void;
  clearProfile: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearProfile: () => set({ profile: null, isLoading: false }),
}));
