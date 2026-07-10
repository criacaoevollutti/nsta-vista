import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { ArrowLeft, Grid3x3, Loader2, PlaySquare, ShieldAlert, UserSquare2 } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Highlights } from "@/components/Highlights";
import { PostGrid } from "@/components/PostGrid";
import { Timeline } from "@/components/Timeline";
import { usePosts, MAX_POSTS } from "@/lib/store";
import { useProfile } from "@/lib/profile-store";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useLiveProfile } from "@/hooks/use-live-profile";


export const Route = createFileRoute("/_authenticated/admin/edit/$userId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Editar empresa — Evollutti" }] }),
  component: AdminEditPage,
});

function AdminEditPage() {
  const { userId: targetId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { isAdmin, loading } = useIsAdmin(user.id);
  const navigate = useNavigate();
  const posts = usePosts((s) => s.posts);
  const handle = useProfile((s) => s.profile.handle);
  

  useEffect(() => {
    if (!isAdmin) return;
    const profileState = useProfile.getState();
    const postsState = usePosts.getState();
    if (profileState.userId !== targetId || postsState.userId !== targetId) {
      profileState.reset();
      postsState.reset();
      void useProfile.getState().hydrate(targetId);
      void usePosts.getState().hydrate(targetId);
    }
  }, [isAdmin, targetId]);

  const refetchTarget = useCallback(() => {
    if (!isAdmin) return;
    useProfile.getState().reset();
    usePosts.getState().reset();
    void useProfile.getState().hydrate(targetId);
    void usePosts.getState().hydrate(targetId);
  }, [isAdmin, targetId]);

  useLiveProfile(isAdmin ? targetId : null, refetchTarget);


  if (loading) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppFrame>
    );
  }

  if (!isAdmin) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Acesso restrito ao admin.</p>
          </div>
        </div>
      </AppFrame>
    );
  }

  const shown = Math.min(posts.length, MAX_POSTS);
  const approved = posts
    .slice(0, MAX_POSTS)
    .filter((p) => p.status === "approved" || p.status === "published").length;

  return (
    <AppFrame>
      <TopBar
        title={handle || "Empresa"}
        subtitle={`Editando · ${shown}/${MAX_POSTS} posts`}
        right={
          <button
            onClick={() => navigate({ to: "/admin" })}
            title="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-primary/10 text-xs text-center py-1.5 border-b border-hairline">
          Modo admin — editando feed de @{handle.replace(/^@+/, "")}
        </div>
        <ProfileHeader approvedCount={approved} total={shown} editable />
        <Highlights scopeId={targetId} />
        <div className="grid grid-cols-3 border-b border-hairline">
          <TabButton icon={<Grid3x3 className="h-[18px] w-[18px]" />} active />
          <TabButton icon={<PlaySquare className="h-[18px] w-[18px]" />} />
          <TabButton icon={<UserSquare2 className="h-[18px] w-[18px]" />} />
        </div>
        <PostGrid />
        <Timeline />
      </div>
    </AppFrame>
  );
}

function TabButton({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`h-11 grid place-items-center relative transition ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {active ? (
        <span className="absolute -bottom-px inset-x-6 h-[2px] rounded-full bg-foreground" />
      ) : null}
    </button>
  );
}
