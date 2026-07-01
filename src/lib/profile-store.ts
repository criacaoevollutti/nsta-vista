import { create } from "zustand";
import type { Profile } from "./types";
import { profile as mockProfile } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

const emptyProfile: Profile = {
  name: "",
  handle: "",
  category: "",
  bio: "",
  location: "",
  site: "",
  avatar: "",
  posts: 0,
  followers: "0",
  following: 0,
};

interface ProfileState {
  profile: Profile;
  userId: string | null;
  loaded: boolean;
  hydrate: (userId: string) => Promise<void>;
  update: (patch: Partial<Profile>) => void;
  reset: () => void;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: emptyProfile,
  userId: null,
  loaded: false,
  reset: () => set({ profile: emptyProfile, userId: null, loaded: false }),

  hydrate: async (userId: string) => {
    if (get().userId === userId && get().loaded) return;
    set({ userId });

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[profile.hydrate]", error);
      return;
    }

    // First-time users: seed from mock so the app feels alive immediately.
    const needsSeed = !data || (!data.avatar && !data.bio && !data.location);
    if (needsSeed) {
      const seed = {
        id: userId,
        name: mockProfile.name,
        handle: mockProfile.handle,
        category: mockProfile.category,
        bio: mockProfile.bio,
        location: mockProfile.location,
        site: mockProfile.site,
        avatar: mockProfile.avatar,
        followers: mockProfile.followers,
        following: mockProfile.following,
      };
      const { data: upserted } = await supabase
        .from("profiles")
        .update(seed)
        .eq("id", userId)
        .select()
        .maybeSingle();
      if (upserted) {
        set({ profile: rowToProfile(upserted), loaded: true });
      }
      return;
    }

    set({ profile: rowToProfile(data), loaded: true });
  },

  update: (patch) => {
    const prev = get().profile;
    const next = { ...prev, ...patch };
    set({ profile: next });

    const userId = get().userId;
    if (!userId) return;

    // Only send DB-backed columns
    const dbPatch: TablesUpdate<"profiles"> = {};
    for (const key of ["name", "handle", "category", "bio", "location", "site", "avatar", "followers", "following"] as const) {
      if (key in patch) (dbPatch as Record<string, unknown>)[key] = patch[key];
    }
    if (Object.keys(dbPatch).length === 0) return;

    void supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", userId)
      .then(({ error }) => {
        if (error) console.error("[profile.update]", error);
      });
  },
}));

function rowToProfile(row: {
  name: string;
  handle: string;
  category: string;
  bio: string;
  location: string;
  site: string;
  avatar: string;
  followers: string;
  following: number;
}): Profile {
  return {
    name: row.name,
    handle: row.handle,
    category: row.category,
    bio: row.bio,
    location: row.location,
    site: row.site,
    avatar: row.avatar,
    followers: row.followers,
    following: row.following,
    posts: 0,
  };
}
