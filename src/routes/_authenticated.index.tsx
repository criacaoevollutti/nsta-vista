import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Grid3x3, LogOut, PlaySquare, UserSquare2 } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Highlights } from "@/components/Highlights";
import { PostGrid } from "@/components/PostGrid";
import { Timeline } from "@/components/Timeline";
import { CycleCelebration } from "@/components/CycleCelebration";
import { usePosts } from "@/lib/store";
import { useProfile } from "@/lib/profile-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Evollutti — Aprovação de Conteúdo" },
      { name: "description", content: "Aprove seu próximo ciclo de conteúdo do Instagram com a experiência de um app nativo." },
      { property: "og:title", content: "Evollutti — Aprovação de Conteúdo" },
      { property: "og:description", content: "Uma projeção fiel do seu Instagram antes da publicação acontecer." },
    ],
  }),
  component: Home,
});

function Home() {
  const posts = usePosts((s) => s.posts);
  const handle = useProfile((s) => s.profile.handle);
  const navigate = useNavigate();
  const approved = posts.filter((p) => p.status === "approved" || p.status === "published").length;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <AppFrame>
      <TopBar
        title={handle}
        subtitle="Projeção do feed"
        right={
          <button
            onClick={signOut}
            title="Sair"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <ProfileHeader approvedCount={approved} total={posts.length} />
        <Highlights />

        {/* Tab bar (visual only, mimics IG) */}
        <div className="grid grid-cols-3 border-b border-hairline">
          <TabButton icon={<Grid3x3 className="h-[18px] w-[18px]" />} active />
          <TabButton icon={<PlaySquare className="h-[18px] w-[18px]" />} />
          <TabButton icon={<UserSquare2 className="h-[18px] w-[18px]" />} />
        </div>

        <PostGrid />
        <Timeline />
      </div>

      <CycleCelebration />
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