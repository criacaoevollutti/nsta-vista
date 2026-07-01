import { useEffect } from "react";
import { usePosts } from "@/lib/store";
import { useProfile } from "@/lib/profile-store";

/**
 * Loads the current user's profile and posts from Lovable Cloud into the
 * local stores. Seeds initial content on the very first sign-in.
 */
export function useHydrateData(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    void useProfile.getState().hydrate(userId);
    void usePosts.getState().hydrate(userId);
  }, [userId]);
}
