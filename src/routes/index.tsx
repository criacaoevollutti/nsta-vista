import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3, PlaySquare, UserSquare2 } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Highlights } from "@/components/Highlights";
import { PostGrid } from "@/components/PostGrid";
import { Timeline } from "@/components/Timeline";
import { CycleCelebration } from "@/components/CycleCelebration";
import { usePosts } from "@/lib/store";
import { profile } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
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
  const approved = posts.filter((p) => p.status === "approved" || p.status === "published").length;

  return (
    <AppFrame>
      <TopBar title={profile.handle} subtitle="Projeção do feed" />
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