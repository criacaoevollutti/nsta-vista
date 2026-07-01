import { create } from "zustand";
import type { Profile } from "./types";
import { profile as initialProfile } from "./mock-data";

interface ProfileState {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
}

export const useProfile = create<ProfileState>((set) => ({
  profile: initialProfile,
  update: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
}));
