import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Delete, Loader2, LockKeyhole, MessageSquareWarning, ShieldCheck, ArrowLeft, Plus, X, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { Highlights } from "@/components/Highlights";
import { supabase } from "@/integrations/supabase/client";
import { isVideoUrl } from "@/lib/utils";
import { MediaThumb } from "@/components/MediaThumb";
import { CarouselMedia } from "@/components/CarouselMedia";
import { EditableText } from "@/components/EditableText";
import { useLiveProfile } from "@/hooks/use-live-profile";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatDateBR(d?: string) {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return d;
}
function formatTypePT(t?: string) {
  const map: Record<string, string> = { image: "Imagem", carousel: "Carrossel", video: "Vídeo", reel: "Reel", story: "Story" };
  return map[t ?? ""] ?? (t ?? "");
}



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
  carousel_images: string[];
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
  posts_count: number | null;
  highlight_names?: Record<string, string> | null;
  highlight_covers?: Record<string, string> | null;
};



type AdminProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  access_pin: string;
  is_admin: boolean;
  position?: number | null;
  post_count?: number;
  approval_counts?: Record<ApprovalKey, number>;
};

type ApprovalKey = "pending" | "approved" | "changes_requested";

function AccessPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ profile: SharedProfile; posts: SharedPost[]; pin: string } | null>(null);

  const refetchCurrent = useCallback(async () => {
    if (!data?.pin) return;
    const { data: res } = await supabase.rpc("get_profile_by_pin", { _pin: data.pin });
    if (!res) return;
    const payload = res as { profile: SharedProfile; posts: SharedPost[] };
    setData({ profile: payload.profile, posts: (payload.posts ?? []).slice(0, 12), pin: data.pin });
  }, [data?.pin]);

  useLiveProfile(data?.profile?.id ?? null, refetchCurrent);

  const [adminList, setAdminList] = useState<AdminProfile[] | null>(null);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [showAdmins, setShowAdmins] = useState<boolean>(() => {
    try {
      const value = new URLSearchParams(window.location.search).get("admins");
      if (value === "1") return true;
      if (value === "0") return false;
      return localStorage.getItem("pinAdmin.showAdmins") === "1";
    } catch {
      return false;
    }
  });
  const [approvalFilter, setApprovalFilter] = useState<"all" | ApprovalKey>(() => {
    try {
      const value = new URLSearchParams(window.location.search).get("approval");
      if (value === "pending" || value === "approved" || value === "changes_requested" || value === "all") return value;
      const stored = localStorage.getItem("pinAdmin.approvalFilter");
      return stored === "pending" || stored === "approved" || stored === "changes_requested" ? stored : "all";
    } catch {
      return "all";
    }
  });
  const [countFilter, setCountFilter] = useState<"all" | "with" | "without" | "full">(() => {
    try {
      const value = new URLSearchParams(window.location.search).get("posts");
      if (value === "with" || value === "without" || value === "full" || value === "all") return value;
      const stored = localStorage.getItem("pinAdmin.countFilter");
      return stored === "with" || stored === "without" || stored === "full" ? stored : "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("pinAdmin.showAdmins", showAdmins ? "1" : "0");
      localStorage.setItem("pinAdmin.approvalFilter", approvalFilter);
      localStorage.setItem("pinAdmin.countFilter", countFilter);

      const url = new URL(window.location.href);
      const setOrDelete = (key: string, value: string, defaultValue: string) => {
        if (value === defaultValue) url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      };

      setOrDelete("admins", showAdmins ? "1" : "0", "0");
      setOrDelete("approval", approvalFilter, "all");
      setOrDelete("posts", countFilter, "all");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Persistência de filtros é opcional quando storage/history não estão disponíveis.
    }
  }, [showAdmins, approvalFilter, countFilter]);

  const filteredAdminList = useMemo(() => {
    if (!adminList) return null;

    return adminList.filter((profile) => {
      const approvals = profile.approval_counts ?? { pending: 0, approved: 0, changes_requested: 0 };
      const postCount = profile.post_count ?? 0;

      if (!showAdmins && profile.is_admin) return false;
      if (approvalFilter !== "all" && (approvals[approvalFilter] ?? 0) === 0) return false;
      if (countFilter === "with" && postCount === 0) return false;
      if (countFilter === "without" && postCount > 0) return false;
      if (countFilter === "full" && postCount < 12) return false;

      return true;
    });
  }, [adminList, approvalFilter, countFilter, showAdmins]);

  const canReorderAdminProfiles = approvalFilter === "all" && countFilter === "all" && !showAdmins;
  const adminProfileSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const reorderAdminProfiles = async (event: DragEndEvent) => {
    if (!adminList || !filteredAdminList || !adminPin || !event.over || event.active.id === event.over.id) return;
    if (!canReorderAdminProfiles) return;

    const oldIndex = filteredAdminList.findIndex((profile) => profile.id === String(event.active.id));
    const newIndex = filteredAdminList.findIndex((profile) => profile.id === String(event.over!.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedVisible = arrayMove(filteredAdminList, oldIndex, newIndex);
    const visibleIds = new Set(filteredAdminList.map((profile) => profile.id));
    const nextList = [
      ...adminList.filter((profile) => !visibleIds.has(profile.id)),
      ...reorderedVisible,
    ];

    setAdminList(nextList);

    const { error } = await supabase.rpc("admin_reorder_profiles", {
      _admin_pin: adminPin,
      _profile_ids: reorderedVisible.map((profile) => profile.id),
    });

    if (error) {
      toast.error("Falha ao salvar ordem");
    }
  };

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
    setAdminPin(null);
    setAdminList(null);
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
          subtitle={`${filteredAdminList?.length ?? adminList.length} de ${adminList.length} contas`}
          right={
            <button onClick={() => { setAdminList(null); setPin(""); }} className="text-xs text-muted-foreground px-3 h-8 rounded-full border border-hairline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Sair
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          <button
            onClick={async () => {
              const name = window.prompt("Nome da nova empresa:");
              if (!name || !name.trim()) return;
              const handle = window.prompt("@ da empresa (opcional):", name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "")) || "";
              const { data: created, error } = await supabase.rpc("admin_create_profile", { _admin_pin: adminPin!, _name: name.trim(), _handle: handle.trim() });
              if (error || !created) { toast.error("Não foi possível criar a empresa"); return; }
              const np = created as unknown as AdminProfile;
              setAdminList((prev) => [...(prev ?? []), np]);
              toast.success(`Empresa criada — PIN ${np.access_pin}`);
            }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-white font-semibold shadow-sm hover:opacity-95 transition"
            style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}
          >
            <Plus className="h-4 w-4" /> Criar nova empresa
          </button>

          <div className="flex flex-wrap gap-2 py-2 text-xs">
            <AdminFilterChip active={showAdmins} onClick={() => setShowAdmins((value) => !value)}>
              {showAdmins ? "Ocultar admins" : "Mostrar admins"}
            </AdminFilterChip>
            <AdminFilterChip active={approvalFilter === "pending"} onClick={() => setApprovalFilter((value) => value === "pending" ? "all" : "pending")}>
              Com pendentes
            </AdminFilterChip>
            <AdminFilterChip active={approvalFilter === "approved"} onClick={() => setApprovalFilter((value) => value === "approved" ? "all" : "approved")}>
              Com aprovados
            </AdminFilterChip>
            <AdminFilterChip active={approvalFilter === "changes_requested"} onClick={() => setApprovalFilter((value) => value === "changes_requested" ? "all" : "changes_requested")}>
              Com alterações
            </AdminFilterChip>
            <AdminFilterChip active={countFilter === "with"} onClick={() => setCountFilter((value) => value === "with" ? "all" : "with")}>
              Com posts
            </AdminFilterChip>
            <AdminFilterChip active={countFilter === "without"} onClick={() => setCountFilter((value) => value === "without" ? "all" : "without")}>
              Sem posts
            </AdminFilterChip>
            <AdminFilterChip active={countFilter === "full"} onClick={() => setCountFilter((value) => value === "full" ? "all" : "full")}>
              Feed cheio
            </AdminFilterChip>
            {showAdmins || approvalFilter !== "all" || countFilter !== "all" ? (
              <button
                type="button"
                onClick={() => { setShowAdmins(false); setApprovalFilter("all"); setCountFilter("all"); }}
                className="h-8 px-3 rounded-full text-xs text-slate-500 hover:text-slate-700"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>

          {filteredAdminList && filteredAdminList.length > 0 ? (
            <DndContext sensors={adminProfileSensors} collisionDetection={closestCenter} onDragEnd={reorderAdminProfiles}>
              <SortableContext items={filteredAdminList.map((profile) => profile.id)} strategy={rectSortingStrategy}>
                <div className="space-y-2">
                  {filteredAdminList.map((profile) => (
                    <SortableAdminProfileCard
                      key={profile.id}
                      profile={profile}
                      loading={loading}
                      canReorder={canReorderAdminProfiles}
                      onOpen={() => openAsAdmin(profile.access_pin)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Nenhuma empresa encontrada.
            </div>
          )}
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
  const [creatingSlot, setCreatingSlot] = useState(false);
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
        title="Grupo Evollutti"
        subtitle="Publievo"
        right={
          <button
            onClick={onExit}
            className="text-xs font-medium text-white px-4 h-9 rounded-full bg-brand-orange hover:bg-brand-orange-soft transition-colors mr-1"
          >
            {isAdmin ? "Voltar" : "Sair"}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-hairline">
          <div className="flex items-center gap-6">
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
              <div className="mb-2">
                {isAdmin ? (
                  <EditableText as="div" value={prof.handle} onChange={(handle) => { setProf((p) => ({ ...p, handle })); void saveProfile({ handle }); }} className="font-semibold text-[15px] leading-tight" />
                ) : (
                  <div className="font-semibold text-[15px] leading-tight truncate">@{prof.handle.replace(/^@+/, "")}</div>
                )}
                {isAdmin ? (
                  <EditableText as="div" value={prof.name} onChange={(name) => { setProf((p) => ({ ...p, name })); void saveProfile({ name }); }} className="text-xs text-muted-foreground" />
                ) : (
                  <div className="text-xs text-muted-foreground truncate">{prof.name}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  {isAdmin ? (
                    <EditableText value={String(prof.posts_count ?? Math.min(posts.length, 12))} onChange={(v) => { const n = Number(v.replace(/\D/g, "")) || 0; setProf((p) => ({ ...p, posts_count: n })); void saveProfile({ posts_count: n } as never); }} className="font-semibold tabular-nums text-[15px] block" />
                  ) : (
                    <div className="font-semibold tabular-nums text-[15px]">{prof.posts_count ?? Math.min(posts.length, 12)}</div>
                  )}
                  <div className="text-[12px] text-muted-foreground">posts</div>
                </div>
                <div>
                  {isAdmin ? (
                    <EditableText value={prof.followers} onChange={(followers) => { setProf((p) => ({ ...p, followers })); void saveProfile({ followers }); }} className="font-semibold tabular-nums text-[15px] block" />
                  ) : (
                    <div className="font-semibold tabular-nums text-[15px]">{prof.followers}</div>
                  )}
                  <div className="text-[12px] text-muted-foreground">seguidores</div>
                </div>
                <div>
                  {isAdmin ? (
                    <EditableText value={String(prof.following)} onChange={(v) => { const n = Number(v.replace(/\D/g, "")) || 0; setProf((p) => ({ ...p, following: n })); void saveProfile({ following: n } as never); }} className="font-semibold tabular-nums text-[15px] block" />
                  ) : (
                    <div className="font-semibold tabular-nums text-[15px]">{prof.following}</div>
                  )}
                  <div className="text-[12px] text-muted-foreground">seguindo</div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-3 text-left">
            {isAdmin ? (
              <EditableText as="div" value={prof.category} onChange={(category) => { setProf((p) => ({ ...p, category })); void saveProfile({ category }); }} className="text-xs text-muted-foreground" />
            ) : prof.category ? (
              <div className="text-xs text-muted-foreground">{prof.category}</div>
            ) : null}

            {isAdmin ? (
              <EditableText
                as="p"
                multiline
                value={prof.bio}
                onChange={(bio) => void onBioBlur(bio)}
                placeholder="Clique para adicionar a bio…"
                className="text-sm mt-1 leading-snug whitespace-pre-line block"
              />
            ) : prof.bio ? (
              <p className="text-sm mt-1 leading-snug whitespace-pre-line">{prof.bio}</p>
            ) : null}
            {savingBio ? <div className="text-[11px] text-muted-foreground mt-1">Salvando…</div> : null}
          </div>
        </div>


        <Highlights
          scopeId={prof.id}
          readOnly={!isAdmin}
          initialNames={(prof.highlight_names as Record<string, string> | undefined) ?? {}}
          initialCovers={(prof.highlight_covers as Record<string, string> | undefined) ?? {}}
          adminPin={adminPin ?? undefined}
        />

        <div className="px-4 py-3 text-xs text-muted-foreground border-b border-hairline">
          {approvedCount} de {posts.length} aprovados
        </div>

        {isAdmin ? (
          <AdminSortableGrid
            posts={posts}
            adminPin={adminPin!}
            targetId={prof.id}
            onReorder={setPosts}
            onOpen={setActive}
            creatingSlot={creatingSlot}
            onCreateSlot={async (i) => {
              setCreatingSlot(true);
              const { data, error } = await supabase.rpc("admin_create_post_for", {
                _admin_pin: adminPin!,
                _target_id: prof.id,
                _position: posts.length + i,
              });
              setCreatingSlot(false);
              if (error || !data) { toast.error("Não foi possível criar postagem"); return; }
              const np = data as unknown as SharedPost;
              setPosts((prev) => [...prev, np]);
              setActive(np);
            }}
          />
        ) : (
          <div className="grid grid-cols-3 gap-[2px] bg-background">
            {posts.slice(0, 12).map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className="relative aspect-[4/5] overflow-hidden"
              >
                <MediaThumb src={p.thumb} alt={p.title} className="h-full w-full object-cover" showPlayIcon isVideo={p.type === "video" || p.type === "reel" || p.type === "story"} />
                <StatusPill status={p.approval_status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {active ? (
        isAdmin ? (
          <AdminPostEditor
            post={active}
            adminPin={adminPin!}
            onClose={() => setActive(null)}
            onUpdated={(updated) => {
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              setActive(updated);
            }}
            onDeleted={(id) => {
              setPosts((prev) => prev.filter((p) => p.id !== id));
              setActive(null);
            }}
          />
        ) : (
          <PostReviewSheet
            post={active}
            pin={pin}
            onClose={() => setActive(null)}
            onUpdated={(updated) => {
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              setActive(updated);
            }}
          />
        )
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
  const [saving, setSaving] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState(post.client_comment ?? "");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  const isVideo = isVideoUrl(post.media || "");
  const ratio = isVideo || post.type === "reel" || post.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]";

  const setStatus = async (
    status: "approved" | "changes_requested" | "pending",
    comment: string,
  ) => {
    const { data, error } = await supabase.rpc("set_post_approval_by_pin", {
      _pin: pin,
      _post_id: post.id,
      _status: status,
      _comment: comment,
    });
    if (error || !data) {
      toast.error("Não foi possível salvar");
      return false;
    }
    onUpdated({ ...post, approval_status: status, client_comment: comment });
    return true;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[68px] z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      {justApproved ? (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none animate-fade-in">
          <div className="h-28 w-28 rounded-full grid place-items-center text-white bg-status-approved shadow-[0_20px_60px_-10px_oklch(0.68_0.17_150/0.6)] animate-scale-in">
            <Check className="h-14 w-14" strokeWidth={3.5} />
          </div>
        </div>
      ) : null}

      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[calc(100dvh-68px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-black">
          {post.type === "carousel" && post.media ? (
            <CarouselMedia
              cover={post.thumb || post.media}
              media={post.media}
              extras={Array.isArray(post.carousel_images) ? post.carousel_images.filter(Boolean) : []}
              alt={post.title}
              ratioClass={ratio}
            />
          ) : isVideo ? (
            <video src={post.media} controls playsInline preload="metadata" className={`w-full object-contain ${ratio}`} />
          ) : (
            <img src={post.media || post.thumb} alt={post.title} className={`w-full object-cover ${ratio}`} />
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                setSaving(true);
                const ok = await setStatus("approved", "");
                setSaving(false);
                if (!ok) return;
                toast.success("Aprovado");
                setJustApproved(true);
                setTimeout(() => setJustApproved(false), 1500);
              }}
              disabled={saving}
              className="h-11 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 bg-status-approved"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
              Aprovar
            </button>
            <button
              onClick={() => setSupportOpen((v) => !v)}
              disabled={saving}
              aria-pressed={supportOpen}
              className="h-11 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 bg-brand-orange"
            >
              <MessageSquareWarning className="h-4 w-4" />
              Solicitar suporte
            </button>
          </div>

          {post.approval_status !== "pending" ? (
            <button
              onClick={async () => {
                const ok = await setStatus("pending", "");
                if (!ok) return;
                toast.success("Marcação removida");
                setSupportOpen(false);
                setSupportText("");
              }}
              className="w-full h-10 rounded-full border border-hairline text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
            >
              Desfazer marcação {post.approval_status === "approved" ? "de aprovação" : "de suporte"}
            </button>
          ) : null}

          {supportOpen ? (
            <div className="rounded-2xl border border-hairline bg-surface-2/40 p-3 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Descreva o que precisa ser feito
              </label>
              <textarea
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
                rows={4}
                placeholder="Ex: gostaria de trocar a foto e ajustar o CTA da legenda..."
                className="w-full rounded-lg border border-hairline bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setSupportOpen(false); setSupportText(post.client_comment ?? ""); }}
                  className="flex-1 h-10 rounded-full border border-hairline text-sm text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!supportText.trim()) { toast.error("Descreva o ajuste"); return; }
                    setSendingSupport(true);
                    const ok = await setStatus("changes_requested", supportText);
                    setSendingSupport(false);
                    if (!ok) return;
                    toast.success("Suporte solicitado");
                    setSupportOpen(false);
                  }}
                  disabled={sendingSupport || !supportText.trim()}
                  className="flex-1 h-10 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 bg-brand-orange"
                >
                  {sendingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
                  Enviar
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Data</span>
              <div className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm flex items-center">{formatDateBR(post.date)}</div>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Hora</span>
              <div className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm flex items-center">{post.time}</div>
            </div>
          </div>

          <div className="text-xs block">
            <span className="text-muted-foreground">Tipo</span>
            <div className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm flex items-center">{formatTypePT(post.type)}</div>
          </div>


          <div className="text-xs block">
            <span className="text-muted-foreground">Legenda</span>
            <div className="mt-1 w-full rounded-md border border-hairline bg-background p-2 text-sm whitespace-pre-wrap min-h-[6rem]">{post.caption || <span className="text-muted-foreground">—</span>}</div>
          </div>

          <button onClick={onClose} className="w-full text-sm text-muted-foreground py-2">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function AdminSortableGrid({
  posts,
  adminPin,
  targetId,
  onReorder,
  onOpen,
  creatingSlot,
  onCreateSlot,
}: {
  posts: SharedPost[];
  adminPin: string;
  targetId: string;
  onReorder: React.Dispatch<React.SetStateAction<SharedPost[]>>;
  onOpen: (p: SharedPost) => void;
  creatingSlot: boolean;
  onCreateSlot: (i: number) => void;
}) {
  const visible = posts.slice(0, 12);
  const empty = Math.max(0, 12 - visible.length);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = visible.findIndex((p) => p.id === String(e.active.id));
    const to = visible.findIndex((p) => p.id === String(e.over!.id));
    if (from < 0 || to < 0) return;
    const next = visible.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    void supabase
      .rpc("admin_reorder_posts", { _admin_pin: adminPin, _target_id: targetId, _post_ids: next.map((p) => p.id) })
      .then(({ error }) => { if (error) toast.error("Falha ao salvar ordem"); });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visible.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-[2px] bg-background">
          {visible.map((p) => (
            <SortableAdminCell
              key={p.id}
              post={p}
              onOpen={onOpen}
              onDelete={async () => {
                if (!window.confirm("Excluir esta postagem?")) return;
                const { data, error } = await supabase.rpc("admin_delete_post", { _admin_pin: adminPin, _post_id: p.id });
                if (error || !data) { toast.error("Falha ao excluir"); return; }
                onReorder((prev) => prev.filter((x) => x.id !== p.id));
                toast.success("Postagem excluída");
              }}
            />
          ))}
          {Array.from({ length: empty }).map((_, i) => (
            <button
              key={`empty-${i}`}
              disabled={creatingSlot}
              onClick={() => onCreateSlot(i)}
              className="relative aspect-[4/5] overflow-hidden bg-surface-2 border border-dashed border-border/60 grid place-items-center text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Adicionar postagem"
            >
              {creatingSlot ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
            </button>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableAdminCell({ post, onOpen, onDelete }: { post: SharedPost; onOpen: (p: SharedPost) => void; onDelete: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: post.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onOpen(post); }}
      className={`relative aspect-[4/5] overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? "shadow-[var(--shadow-lg)] rounded-md" : ""}`}
    >
      <MediaThumb src={post.thumb} alt={post.title} className="h-full w-full object-cover" showPlayIcon isVideo={post.type === "video" || post.type === "reel" || post.type === "story"} />
      <StatusPill status={post.approval_status} />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
        aria-label="Excluir postagem"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}


function AdminPostEditor({
  post,
  adminPin,
  onClose,
  onUpdated,
  onDeleted,
}: {
  post: SharedPost;
  adminPin: string;
  onClose: () => void;
  onUpdated: (p: SharedPost) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    title: post.title,
    caption: post.caption,
    date: post.date,
    time: post.time,
    type: post.type,
    media: post.media,
    thumb: post.thumb,
    carousel_images: Array.isArray(post.carousel_images) ? post.carousel_images : [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [deleting, setDeleting] = useState(false);


  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);



  const isVideo = isVideoUrl(form.media || "");
  const ratio = isVideo || form.type === "reel" || form.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]";

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast.error("Arquivo maior que 500MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `pin/${post.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("sign fail");
      const isVid = file.type.startsWith("video/");
      setForm((f) => ({ ...f, media: signed.signedUrl, thumb: signed.signedUrl, type: isVid ? (f.type === "reel" || f.type === "story" ? f.type : "reel") : (f.type === "reel" || f.type === "story" || f.type === "video" ? "image" : f.type) }));
      toast.success("Mídia enviada");
    } catch (err) {
      console.error(err);
      toast.error("Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Imagem maior que 50MB"); return; }
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `pin/${post.id}-cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("sign fail");
      setForm((f) => ({ ...f, thumb: signed.signedUrl }));
      toast.success("Capa atualizada");
    } catch (err) {
      console.error(err);
      toast.error("Falha no envio da capa");
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const remaining = 10 - form.carousel_images.length;
    if (remaining <= 0) { toast.error("Limite de 10 imagens atingido"); return; }
    const toUpload = files.slice(0, remaining);
    setUploadingExtra(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (file.size > 50 * 1024 * 1024) { toast.error(`"${file.name}" maior que 50MB`); continue; }
        if (!file.type.startsWith("image/")) { toast.error(`"${file.name}" não é imagem`); continue; }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `pin/${post.id}-extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) { toast.error("Falha no envio"); continue; }
        const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) urls.push(signed.signedUrl);
      }
      if (urls.length) {
        setForm((f) => ({ ...f, carousel_images: [...f.carousel_images, ...urls].slice(0, 10) }));
        toast.success(`${urls.length} imagem(ns) adicionada(s)`);
      }
    } finally {
      setUploadingExtra(false);
    }
  };

  const removeExtra = (idx: number) => {
    setForm((f) => ({ ...f, carousel_images: f.carousel_images.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("admin_update_post", {
      _admin_pin: adminPin,
      _post_id: post.id,
      _patch: form as unknown as never,
    });
    setSaving(false);
    if (error || !data) { toast.error("Não foi possível salvar"); return; }
    toast.success("Salvo");
    onUpdated({ ...post, ...form });
  };

  const remove = async () => {
    if (!window.confirm("Excluir esta postagem?")) return;
    setDeleting(true);
    const { data, error } = await supabase.rpc("admin_delete_post", { _admin_pin: adminPin, _post_id: post.id });
    setDeleting(false);
    if (error || !data) { toast.error("Falha ao excluir"); return; }
    onDeleted(post.id);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[68px] z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>



      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[calc(100dvh-68px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-black">
          {form.type === "carousel" && form.media ? (
            <CarouselMedia
              cover={form.thumb || form.media}
              media={form.media}
              extras={form.carousel_images ?? []}
              alt={form.title}
              ratioClass={ratio}
            />
          ) : form.media && isVideo ? (
            <video src={form.media} poster={form.thumb && form.thumb !== form.media ? form.thumb : undefined} controls playsInline preload="metadata" className={`w-full object-contain ${ratio}`} />
          ) : form.media ? (
            <img src={form.media} alt={form.title} className={`w-full object-cover ${ratio}`} />
          ) : (
            <div className={`w-full ${ratio} grid place-items-center text-white/60 text-sm`}>Sem mídia</div>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            {(isVideo || form.type === "reel") && (
              <button
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="h-10 px-3 rounded-full bg-white/90 text-black text-xs font-semibold shadow-md inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Capa
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-10 px-3 rounded-full text-white text-xs font-semibold shadow-md inline-flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Trocar mídia
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={upload} />
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="text-muted-foreground">Data</span>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm" />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Hora</span>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm" />
            </label>
          </div>

          <label className="text-xs block">
            <span className="text-muted-foreground">Tipo</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-hairline bg-background px-2 text-sm">
              <option value="image">Foto</option>
              <option value="carousel">Carrossel</option>
              <option value="reel">Reels</option>
            </select>
          </label>

          {form.type === "carousel" ? (
            <div className="text-xs block">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Imagens do carrossel <span className="text-muted-foreground/70">(além da capa · {form.carousel_images.length}/10)</span></span>
                <button
                  type="button"
                  onClick={() => extraRef.current?.click()}
                  disabled={uploadingExtra || form.carousel_images.length >= 10}
                  className="h-8 px-2.5 rounded-full border border-hairline text-xs inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {uploadingExtra ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  Adicionar
                </button>
              </div>
              <input ref={extraRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadExtra} />
              {form.carousel_images.length ? (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {form.carousel_images.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative aspect-square rounded-md overflow-hidden border border-hairline bg-black">
                      <img src={url} alt={`Imagem ${i + 2}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExtra(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black"
                        aria-label="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 h-5 min-w-5 px-1 rounded-full bg-black/70 text-white text-[10px] grid place-items-center">{i + 2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-muted-foreground/80 text-xs">Nenhuma imagem adicional. A capa acima é a primeira do carrossel.</div>
              )}
            </div>
          ) : null}




          <label className="text-xs block">
            <span className="text-muted-foreground">Legenda</span>
            <textarea value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} rows={5} className="mt-1 w-full rounded-md border border-hairline bg-background p-2 text-sm resize-none" />
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={remove}
              disabled={deleting || saving}
              className="h-11 px-4 rounded-full border border-hairline text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir
            </button>
            <button
              onClick={save}
              disabled={saving || uploading}
              className="flex-1 h-11 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7c3aed,#f97316)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
              Salvar alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
