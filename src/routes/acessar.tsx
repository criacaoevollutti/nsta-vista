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
import { EditableText } from "@/components/EditableText";

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
  followers: string;
  following: number;
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
  adminPin,
  onExit,
}: {
  profile: SharedProfile;
  initialPosts: SharedPost[];
  pin: string;
  adminPin: string | null;
  onExit: () => void;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [active, setActive] = useState<SharedPost | null>(null);
  const [prof, setProf] = useState(profile);
  const [savingBio, setSavingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const approvedCount = posts.filter((p) => p.approval_status === "approved").length;
  const isAdmin = adminPin !== null;

  const saveProfile = async (patch: Partial<SharedProfile>) => {
    if (!isAdmin) return;
    const { data, error } = await supabase.rpc("admin_update_profile", {
      _admin_pin: adminPin!,
      _target_id: prof.id,
      _patch: patch as unknown as never,
    });
    if (error || !data) {
      toast.error("Não foi possível salvar");
      return false;
    }
    return true;
  };

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Imagem muito grande (máx 1MB)");
      return;
    }
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const ok = await saveProfile({ avatar: dataUrl });
    setUploading(false);
    if (ok) {
      setProf((p) => ({ ...p, avatar: dataUrl }));
      toast.success("Foto atualizada");
    }
  };

  const onBioBlur = async (val: string) => {
    if (val === prof.bio) return;
    setSavingBio(true);
    const ok = await saveProfile({ bio: val });
    setSavingBio(false);
    if (ok) {
      setProf((p) => ({ ...p, bio: val }));
      toast.success("Bio atualizada");
    }
  };

  return (
    <AppFrame>
      <TopBar
        title={prof.handle}
        subtitle={isAdmin ? "Modo admin — editando" : "Aprovação do ciclo"}
        right={
          <button onClick={onExit} className="text-xs text-muted-foreground px-3 h-8 rounded-full border border-hairline">
            {isAdmin ? "Voltar" : "Sair"}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {isAdmin ? (
          <div className="bg-primary/10 text-xs text-center py-1.5 border-b border-hairline">
            Modo admin — editando @{prof.handle}
          </div>
        ) : null}
        <div className="p-4 flex items-start gap-4 border-b border-hairline">
          <div className="relative shrink-0">
            {prof.avatar ? (
              <img src={prof.avatar} alt={prof.name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-surface-2" />
            )}
            {isAdmin ? (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full grid place-items-center text-white shadow-md"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}
                  title="Trocar foto"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
              </>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            {isAdmin ? (
              <EditableText as="div" value={prof.name} onChange={(name) => { setProf((p) => ({ ...p, name })); void saveProfile({ name }); }} className="font-semibold" />
            ) : (
              <div className="font-semibold truncate">{prof.name}</div>
            )}
            {isAdmin ? (
              <EditableText as="div" value={prof.category} onChange={(category) => { setProf((p) => ({ ...p, category })); void saveProfile({ category }); }} className="text-xs text-muted-foreground" />
            ) : (
              <div className="text-xs text-muted-foreground">{prof.category}</div>
            )}
            <div className="flex gap-4 mt-2 text-[13px]">
              <div><span className="font-semibold tabular-nums">{posts.length}</span> <span className="text-muted-foreground">posts</span></div>
              <div className="flex items-baseline gap-1">
                {isAdmin ? (
                  <EditableText value={prof.followers} onChange={(followers) => { setProf((p) => ({ ...p, followers })); void saveProfile({ followers }); }} className="font-semibold tabular-nums" />
                ) : (
                  <span className="font-semibold tabular-nums">{prof.followers}</span>
                )}
                <span className="text-muted-foreground">seguidores</span>
              </div>
              <div className="flex items-baseline gap-1">
                {isAdmin ? (
                  <EditableText value={String(prof.following)} onChange={(v) => { const n = Number(v.replace(/\D/g, "")) || 0; setProf((p) => ({ ...p, following: n })); void saveProfile({ following: n } as never); }} className="font-semibold tabular-nums" />
                ) : (
                  <span className="font-semibold tabular-nums">{prof.following}</span>
                )}
                <span className="text-muted-foreground">seguindo</span>
              </div>
            </div>

            {isAdmin ? (
              <EditableText
                as="p"
                multiline
                value={prof.bio}
                onChange={(bio) => void onBioBlur(bio)}
                placeholder="Clique para adicionar a bio…"
                className="text-sm mt-2 leading-snug whitespace-pre-line block"
              />
            ) : prof.bio ? (
              <p className="text-sm mt-2 leading-snug whitespace-pre-line">{prof.bio}</p>
            ) : null}
            {savingBio ? <div className="text-[11px] text-muted-foreground mt-1">Salvando…</div> : null}
          </div>

        </div>

        <Highlights />

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
