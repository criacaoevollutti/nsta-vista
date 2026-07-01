import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovação de Conteúdo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedView,
});

type SharedPost = {
  id: string;
  media: string;
  thumb: string;
  type: string;
  title: string;
  caption: string;
  date: string;
  time: string;
  position: number;
  approval_status: "pending" | "approved" | "changes_requested";
  client_comment: string;
};

type SharedProfile = {
  id: string;
  name: string;
  handle: string;
  category: string;
  bio: string;
  avatar: string;
};

function SharedView() {
  const { token } = Route.useParams();
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [posts, setPosts] = useState<SharedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState<SharedPost | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_shared_profile", { _token: token });
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const payload = data as { profile: SharedProfile; posts: SharedPost[] };
    setProfile(payload.profile);
    setPosts(payload.posts ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppFrame>
    );
  }

  if (notFound || !profile) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
            <h1 className="font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link expirou ou não existe. Peça um novo link à sua agência.
            </p>
          </div>
        </div>
      </AppFrame>
    );
  }

  const approvedCount = posts.filter((p) => p.approval_status === "approved").length;

  return (
    <AppFrame>
      <TopBar title={profile.handle} subtitle="Aprovação do ciclo" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 flex items-center gap-4 border-b border-hairline">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-surface-2" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{profile.name}</div>
            <div className="text-xs text-muted-foreground">{profile.category}</div>
            {profile.bio ? <p className="text-sm mt-1 line-clamp-2">{profile.bio}</p> : null}
          </div>
        </div>

        <div className="px-4 py-3 text-xs text-muted-foreground border-b border-hairline">
          {approvedCount} de {posts.length} aprovados
        </div>

        <div className="grid grid-cols-3 gap-[2px] bg-background">
          {posts.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="relative aspect-[4/5] overflow-hidden"
            >
              <img src={p.thumb} alt={p.title} className="h-full w-full object-cover" />
              <StatusPill status={p.approval_status} />
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <PostReviewSheet
          post={active}
          token={token}
          onClose={() => setActive(null)}
          onUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setActive(updated);
          }}
        />
      ) : null}
    </AppFrame>
  );
}

function StatusPill({ status }: { status: SharedPost["approval_status"] }) {
  if (status === "pending") return null;
  const cls =
    status === "approved"
      ? "bg-status-approved"
      : "bg-status-revision";
  return (
    <div className={`absolute bottom-1.5 left-1.5 h-5 min-w-5 px-1 rounded-full grid place-items-center text-white ${cls} shadow-[0_2px_6px_rgba(0,0,0,0.25)]`}>
      {status === "approved" ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        <MessageSquareWarning className="h-3 w-3" strokeWidth={2.5} />
      )}
    </div>
  );
}

function PostReviewSheet({
  post,
  token,
  onClose,
  onUpdated,
}: {
  post: SharedPost;
  token: string;
  onClose: () => void;
  onUpdated: (p: SharedPost) => void;
}) {
  const [comment, setComment] = useState(post.client_comment ?? "");
  const [saving, setSaving] = useState<"approved" | "changes_requested" | null>(null);

  const submit = async (status: "approved" | "changes_requested") => {
    setSaving(status);
    const { data, error } = await supabase.rpc("set_post_approval", {
      _token: token,
      _post_id: post.id,
      _status: status,
      _comment: comment,
    });
    setSaving(null);
    if (error || !data) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(status === "approved" ? "Post aprovado" : "Alteração solicitada");
    onUpdated({ ...post, approval_status: status, client_comment: comment });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={post.media || post.thumb} alt={post.title} className={`w-full object-cover ${post.type === "reel" || post.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]"}`} />
        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {post.date} • {post.time}
            </div>
            <h2 className="font-semibold mt-1">{post.title}</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground mt-2">{post.caption}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Comentário para a agência (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-hairline bg-background p-2 text-sm resize-none"
              placeholder="Ex: trocar a legenda para..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => submit("changes_requested")}
              disabled={saving !== null}
              className="flex-1 h-11 rounded-full border border-hairline text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving === "changes_requested" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquareWarning className="h-4 w-4" />
              )}
              Solicitar alteração
            </button>
            <button
              onClick={() => submit("approved")}
              disabled={saving !== null}
              className="flex-1 h-11 rounded-full bg-status-approved text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving === "approved" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={3} />
              )}
              Aprovar
            </button>
          </div>

          <button onClick={onClose} className="w-full text-sm text-muted-foreground py-2">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
