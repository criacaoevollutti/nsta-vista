import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePosts } from "@/lib/store";
import { useProfile } from "@/lib/profile-store";

/**
 * Loads the current user's profile and posts from Lovable Cloud into the
 * local stores. Subscribes to realtime updates so edits by any connected
 * user (admin or client) reflect live on all screens.
 */
export function useHydrateData(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    void useProfile.getState().hydrate(userId);
    void usePosts.getState().hydrate(userId);

    const channel = supabase
      .channel(`live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
        () => {
          void usePosts.getState().hydrate(userId);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          void useProfile.getState().hydrate(userId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
