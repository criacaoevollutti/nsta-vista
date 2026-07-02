import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Check, Delete, Loader2, LockKeyhole, MessageSquareWarning, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { Highlights } from "@/components/Highlights";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/utils";
import { MediaThumb } from "@/components/MediaThumb";

export const Route = createFileRoute("/acessar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acessar sua conta — Evollutti" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccessPage,
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

type AdminProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  access_pin: string;
  is_admin: boolean;
};

function AccessPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ profile: SharedProfile; posts: SharedPost[]; pin: string } | null>(null);
  const [adminList, setAdminList] = useState<AdminProfile[] | null>(null);
  const [adminPin, setAdminPin] = useState<string | null>(null);

  const submit = async (value: string) => {
    if (value.length !== 4) return;
    setLoading(true);
    setError(null);

    const { data: adminRes } = await supabase.rpc("get_admin_data_by_pin", { _pin: value });
    if (adminRes) {
      setLoading(false);
      const payload = adminRes as { profiles: AdminProfile[] };
      setAdminList(payload.profiles ?? []);
      setAdminPin(value);
      return;
    }

    const { data: res, error: err } = await supabase.rpc("get_profile_by_pin", { _pin: value });
    setLoading(false);
    if (err || !res) {
      setError("PIN inválido. Tente novamente.");
      setPin("");
      return;
    }
    const payload = res as { profile: SharedProfile; posts: SharedPost[] };
    setData({ profile: payload.profile, posts: (payload.posts ?? []).slice(0, 12), pin: value });
  };

  const openAsAdmin = async (targetPin: string) => {
    setLoading(true);
    const { data: res } = await supabase.rpc("get_profile_by_pin", { _pin: targetPin });
    setLoading(false);
    if (!res) {
      toast.error("Não foi possível abrir essa conta");
      return;
    }
    const payload = res as { profile: SharedProfile; posts: SharedPost[] };
    setData({ profile: payload.profile, posts: (payload.posts ?? []).slice(0, 12), pin: targetPin });
  };

  const push = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === 4) void submit(next);
  };
  const back = () => setPin((p) => p.slice(0, -1));

  if (data) return <ClientFeed profile={data.profile} initialPosts={data.posts} pin={data.pin} adminPin={adminPin} onExit={() => { setData(null); if (!adminList) { setPin(""); setAdminPin(null); } }} />;

  if (adminList) {
    return (
      <AppFrame>
        <TopBar
          title="Painel admin"
          subtitle={`${adminList.length} contas`}
          right={
            <button onClick={() => { setAdminList(null); setPin(""); }} className="text-xs text-muted-foreground px-3 h-8 rounded-full border border-hairline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Sair
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          {adminList.map((p) => (
            <button
              key={p.id}
              onClick={() => openAsAdmin(p.access_pin)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition text-left disabled:opacity-50"
            >
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full grid place-items-center text-white font-semibold" style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                  {p.name}
                  {p.is_admin ? <ShieldCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" /> : null}
                </div>
                <div className="text-xs text-slate-500 truncate">@{p.handle}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">PIN</div>
                <div className="text-sm font-mono font-bold text-orange-600">{p.access_pin}</div>
              </div>
            </button>
          ))}
        </div>
      </AppFrame>
    );
  }


  return (
    <AppFrame>
      <div className="flex-1 grid place-items-center p-6" style={{ background: "#fff" }}>
        <div className="w-full max-w-xs space-y-8 text-center">
          <div className="space-y-2">
            <div className="h-14 w-14 mx-auto rounded-2xl grid place-items-center" style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}>
              <LockKeyhole className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Digite seu PIN</h1>
            <p className="text-sm text-slate-500">4 dígitos fornecidos pela sua agência</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 w-12 rounded-xl grid place-items-center text-2xl font-bold border-2 transition-all"
                style={{
                  borderColor: pin.length === i ? "#7c3aed" : "#e5e7eb",
                  background: pin[i] ? "#faf5ff" : "#fff",
                  color: "#1e1b4b",
                }}
              >
                {loading && i === 3 ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#7c3aed" }} /> : pin[i] ?? ""}
              </div>
            ))}
          </div>

          {error ? <p className="text-sm" style={{ color: "#f97316" }}>{error}</p> : null}

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => push(d)}
                disabled={loading}
                className="h-14 rounded-xl text-xl font-semibold active:scale-95 transition-all disabled:opacity-50"
                style={{ background: "#f8fafc", color: "#1e1b4b" }}
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => push("0")}
              disabled={loading}
              className="h-14 rounded-xl text-xl font-semibold active:scale-95 transition-all disabled:opacity-50"
              style={{ background: "#f8fafc", color: "#1e1b4b" }}
            >
              0
            </button>
            <button
              onClick={back}
              disabled={loading}
              className="h-14 rounded-xl grid place-items-center active:scale-95 transition-all disabled:opacity-50"
              style={{ background: "#fff7ed", color: "#f97316" }}
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

function ClientFeed({
  profile,
  initialPosts,
  pin,
  onExit,
}: {
  profile: SharedProfile;
  initialPosts: SharedPost[];
  pin: string;
  onExit: () => void;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [active, setActive] = useState<SharedPost | null>(null);
  const approvedCount = posts.filter((p) => p.approval_status === "approved").length;

  return (
    <AppFrame>
      <TopBar
        title={profile.handle}
        subtitle="Aprovação do ciclo"
        right={
          <button onClick={onExit} className="text-xs text-muted-foreground px-3 h-8 rounded-full border border-hairline">
            Sair
          </button>
        }
      />
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
              <MediaThumb src={p.thumb} alt={p.title} className="h-full w-full object-cover" showPlayIcon />
              <StatusPill status={p.approval_status} />
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <PostReviewSheet
          post={active}
          pin={pin}
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
  const cls = status === "approved" ? "bg-status-approved" : "bg-status-revision";
  return (
    <div className={`absolute bottom-1.5 left-1.5 h-5 min-w-5 px-1 rounded-full grid place-items-center text-white ${cls} shadow-[0_2px_6px_rgba(0,0,0,0.25)]`}>
      {status === "approved" ? <Check className="h-3 w-3" strokeWidth={3} /> : <MessageSquareWarning className="h-3 w-3" strokeWidth={2.5} />}
    </div>
  );
}

function PostReviewSheet({
  post,
  pin,
  onClose,
  onUpdated,
}: {
  post: SharedPost;
  pin: string;
  onClose: () => void;
  onUpdated: (p: SharedPost) => void;
}) {
  const [comment, setComment] = useState(post.client_comment ?? "");
  const [saving, setSaving] = useState<"approved" | "changes_requested" | null>(null);

  const submit = async (status: "approved" | "changes_requested") => {
    setSaving(status);
    const { data, error } = await supabase.rpc("set_post_approval_by_pin", {
      _pin: pin,
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

  const isVideo = isVideoUrl(post.media || "");
  const ratio = isVideo || post.type === "reel" || post.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={post.media} controls playsInline preload="metadata" className={`w-full object-contain bg-black ${ratio}`} />
        ) : (
          <img src={post.media || post.thumb} alt={post.title} className={`w-full object-cover ${ratio}`} />
        )}
        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">{post.date} • {post.time}</div>
            <h2 className="font-semibold mt-1">{post.title}</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground mt-2">{post.caption}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Comentário para a agência (opcional)</label>
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
              {saving === "changes_requested" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareWarning className="h-4 w-4" />}
              Solicitar alteração
            </button>
            <button
              onClick={() => submit("approved")}
              disabled={saving !== null}
              className="flex-1 h-11 rounded-full bg-status-approved text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
              Aprovar
            </button>
          </div>
          <button onClick={onClose} className="w-full text-sm text-muted-foreground py-2">Fechar</button>
        </div>
      </div>
    </div>
  );
}
