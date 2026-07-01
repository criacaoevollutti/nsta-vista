import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHydrateData } from "@/hooks/use-hydrate-data";
import { usePosts } from "@/lib/store";
import { useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Skip on server — no Supabase session exists during SSR, and ssr:false
    // means the component tree won't render server-side anyway.
    if (typeof window === "undefined") return { user: null as unknown as { id: string } };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  useHydrateData(user.id);

  useEffect(() => {
    // Reset local stores on sign-out
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        usePosts.getState().reset();
        useProfile.getState().reset();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Outlet />;
}
