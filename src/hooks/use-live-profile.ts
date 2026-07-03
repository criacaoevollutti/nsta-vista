import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on posts/profiles for a given user id.
 * Calls `onChange` whenever a row is inserted, updated, or deleted.
 * Pass `null` when there is nothing to watch.
 */
export function useLiveProfile(userId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`view-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => onChange(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onChange]);
}
