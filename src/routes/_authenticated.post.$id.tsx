import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Film,
  Images,
  Loader2,
  MessageSquare,
  MoveHorizontal,
  Pencil,
  Play,
  Send,
  Sparkles,
  Target,
  Trash2,


} from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { usePosts } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { STATUS_META, TYPE_LABEL, type PostType } from "@/lib/types";

const MAX_MB = 500;
import { isVideoUrl } from "@/lib/utils";
import { CarouselMedia } from "@/components/CarouselMedia";

async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let done = false;
    const finish = (b: Blob | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(b);
    };

    const timeout = window.setTimeout(() => finish(null), 8000);

    video.onloadedmetadata = () => {
      const target = Math.max(0.1, (video.duration || 2) / 2);
      video.onseeked = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) return finish(null);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, w, h);
          canvas.toBlob(
            (b) => {
              clearTimeout(timeout);
              finish(b);
            },
            "image/jpeg",
            0.85,
          );
        } catch {
          finish(null);
        }
      };
      try {
        video.currentTime = target;
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
  });
}


export const Route = createFileRoute("/_authenticated/post/$id")({
  ssr: false,
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const post = usePosts((s) => s.posts.find((p) => p.id === id));
  const update = usePosts((s) => s.update);
  const setStatus = usePosts((s) => s.setStatus);
  const setApproval = usePosts((s) => s.setApproval);
  const duplicate = usePosts((s) => s.duplicate);
  const remove = usePosts((s) => s.remove);
  const [uid, setUid] = useState<string | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUid(data.user?.id));
  }, []);
  const { isAdmin } = useIsAdmin(uid);
  const canEdit = isAdmin;

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !post) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Envie apenas imagem ou vídeo.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `${uid}/${post.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) throw signErr ?? new Error("Falha ao gerar URL");
      let thumbUrl = signed.signedUrl;
      if (isVideo) {
        const blob = await captureVideoThumbnail(file);
        if (blob) {
          const thumbPath = `${uid}/${post.id}-${Date.now()}-thumb.jpg`;
          const { error: tErr } = await supabase.storage
            .from("media")
            .upload(thumbPath, blob, { contentType: "image/jpeg", upsert: true });
          if (!tErr) {
            const { data: tSigned } = await supabase.storage
              .from("media")
              .createSignedUrl(thumbPath, 60 * 60 * 24 * 365);
            if (tSigned) thumbUrl = tSigned.signedUrl;
          }
        }
      }
      const patch: Partial<typeof post> = { media: signed.signedUrl, thumb: thumbUrl || signed.signedUrl };
      if (isVideo && post.type !== "reel" && post.type !== "story" && post.type !== "video") {
        patch.type = "reel";
      }
      if (isImage && (post.type === "reel" || post.type === "video")) {
        patch.type = "image";
      }
      update(post.id, patch);
      toast.success(isVideo ? "Vídeo enviado" : "Imagem enviada");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !post) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem para a capa.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Capa maior que 20MB.");
      return;
    }
    setUploadingCover(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${post.id}-${Date.now()}-cover.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw sErr ?? new Error("Falha ao gerar URL");
      update(post.id, { thumb: signed.signedUrl });
      toast.success("Capa atualizada");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar a capa");
    } finally {
      setUploadingCover(false);
    }
  };




  if (!post) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <div className="text-[15px] font-semibold">Postagem não encontrada</div>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 text-brand-purple text-sm font-medium"
            >
              Voltar ao feed
            </button>
          </div>
        </div>
      </AppFrame>
    );
  }

  const status = STATUS_META[post.status];

  const approve = async () => {
    const ok = await setApproval(post.id, "approved", post.clientComment ?? "");
    if (!ok) return;
    if (canEdit) setStatus(post.id, "approved");
    setJustApproved(true);
    setTimeout(() => setJustApproved(false), 1400);
  };

  const sendSupport = async () => {
    if (!supportText.trim()) return;
    const ok = await setApproval(post.id, "changes_requested", supportText);
    if (!ok) return;
    if (canEdit) setStatus(post.id, "revision");
    setSupportSent(true);
    setTimeout(() => {
      setSupportOpen(false);
      setSupportSent(false);
    }, 1200);
  };


  return (
    <AppFrame>
      {/* Custom top bar over media */}
      <div className="sticky top-0 z-40 glass border-b border-hairline">
        <div className="flex items-center justify-between h-14 px-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {TYPE_LABEL[post.type]}
            </div>
            <div className={`text-[12px] font-medium ${status.color} flex items-center gap-1.5 justify-center`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </div>
          </div>
          {canEdit ? (
            <button
              onClick={() => duplicate(post.id)}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
              title="Duplicar"
            >
              <Copy className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        {/* Media */}
        <motion.div
          layoutId={`media-${post.id}`}
          className={`relative w-full bg-surface-2 ${isVideoUrl(post.media) || post.type === "reel" || post.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]"}`}
        >
          {isVideoUrl(post.media) ? (
            <video
              key={post.media}
              src={post.media}
              poster={post.thumb && post.thumb !== post.media ? post.thumb : undefined}
              className="h-full w-full object-contain bg-black"
              controls
              playsInline
              preload="metadata"
              onError={() => toast.error("Formato de vídeo não suportado pelo navegador. Envie MP4 (H.264).")}
            />
          ) : (
            <img src={post.media} alt={post.title} className="h-full w-full object-cover" />
          )}
          {!isVideoUrl(post.media) && (post.type === "video" || post.type === "reel") ? (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="h-14 w-14 rounded-full bg-white/25 backdrop-blur-md grid place-items-center">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
          ) : null}
          {post.type === "carousel" ? (
            <div className="absolute top-3 right-3 h-7 px-2 rounded-full bg-black/45 text-white text-[11px] font-medium flex items-center gap-1">
              <Images className="h-3.5 w-3.5" /> 1/5
            </div>
          ) : null}

          {canEdit ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 h-9 px-3 rounded-full glass text-[12px] font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] active:scale-95 transition disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Trocar mídia
                  </>
                )}
              </button>
              {isVideoUrl(post.media) ? (
                <>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-14 right-3 h-9 px-3 rounded-full glass text-[12px] font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] active:scale-95 transition disabled:opacity-70"
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando capa…
                      </>
                    ) : (
                      <>
                        <Images className="h-3.5 w-3.5" /> Trocar capa
                      </>
                    )}
                  </button>
                </>
              ) : null}
              <div className="absolute bottom-3 left-3 h-7 px-2 rounded-full bg-black/45 text-white text-[10px] font-medium flex items-center gap-1">
                <Film className="h-3 w-3" /> Máx {MAX_MB}MB · imagem ou vídeo
              </div>
            </>
          ) : null}
        </motion.div>


        {/* Fields */}
        <div className="p-5 space-y-4">
          <EditableField
            icon={<Target className="h-4 w-4" />}
            label="Objetivo da postagem"
            value={post.objective}
            onChange={(v) => update(post.id, { objective: v })}
            readOnly={!canEdit}
          />
          <EditableField
            icon={<MessageSquare className="h-4 w-4" />}
            label="Legenda"
            value={post.caption}
            onChange={(v) => update(post.id, { caption: v })}
            multiline
            readOnly={!canEdit}
          />
          {canEdit || post.notes ? (
            <EditableField
              icon={<Sparkles className="h-4 w-4" />}
              label="Observações internas"
              value={post.notes}
              placeholder="Notas visíveis apenas para a equipe"
              onChange={(v) => update(post.id, { notes: v })}
              multiline
              readOnly={!canEdit}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <MetaField
              icon={<CalendarClock className="h-4 w-4" />}
              label="Data"
              type="date"
              value={post.date}
              onChange={(v) => update(post.id, { date: v })}
              readOnly={!canEdit}
            />
            <MetaField
              icon={<CalendarClock className="h-4 w-4" />}
              label="Horário"
              type="time"
              value={post.time}
              onChange={(v) => update(post.id, { time: v })}
              readOnly={!canEdit}
            />
          </div>

          {canEdit ? (
            <>
              {/* Type picker */}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">
                  Tipo
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["image", "carousel", "video", "reel", "story"] as PostType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => update(post.id, { type: t })}
                      className={`h-8 px-3 rounded-full text-[12px] font-medium border transition active:scale-95 ${
                        post.type === t
                          ? "bg-foreground text-primary-foreground border-transparent"
                          : "bg-surface border-hairline text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary actions */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <SecondaryAction
                  icon={<MoveHorizontal className="h-4 w-4" />}
                  label="Mover"
                  onClick={() => navigate({ to: "/" })}
                />
                <SecondaryAction
                  icon={<Copy className="h-4 w-4" />}
                  label="Duplicar"
                  onClick={() => duplicate(post.id)}
                />
                <SecondaryAction
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Excluir"
                  danger
                  onClick={() => {
                    remove(post.id);
                    navigate({ to: "/" });
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Sticky decision panel */}
      <div className="absolute bottom-0 inset-x-0 glass border-t border-hairline">
        <div className="px-5 pt-4 pb-1">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            Decisão desta postagem
          </h3>
          <p className="text-[13px] text-muted-foreground/90 mt-0.5">
            Revise o conteúdo e escolha como prosseguir.
          </p>
        </div>

        <div className="p-4 pt-3 pb-6 space-y-3">
          {/* Paired action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={approve}
              disabled={post.approvalStatus === "approved"}
              className={`h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md ${
                post.approvalStatus === "approved"
                  ? "bg-success-soft text-status-approved shadow-none"
                  : "bg-status-approved text-white shadow-[0_8px_20px_-8px_oklch(0.68_0.17_150/0.55)]"
              }`}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {post.approvalStatus === "approved" ? "Aprovado" : "Aprovar"}
            </button>

            <button
              onClick={() => setSupportOpen((v) => !v)}
              aria-pressed={supportOpen}
              className={`h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md ${
                supportOpen
                  ? "bg-brand-orange text-white shadow-[0_8px_20px_-8px_oklch(0.72_0.18_50/0.55)]"
                  : "bg-brand-orange text-white shadow-[0_8px_20px_-8px_oklch(0.72_0.18_50/0.55)]"
              }`}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
              Solicitar ajuste
            </button>
          </div>

          {/* Inline adjustment flow */}
          <AnimatePresence initial={false}>
            {supportOpen ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-2/60 rounded-2xl p-4 border border-hairline space-y-3 mt-1">
                  <label className="text-xs font-semibold text-foreground ml-1 block">
                    O que deseja ajustar?
                  </label>
                  <textarea
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    rows={3}
                    placeholder="Ex: gostaria de trocar a foto e ajustar o CTA da legenda..."
                    className="w-full bg-background border border-hairline rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none transition-all resize-none"
                  />
                  <button
                    onClick={sendSupport}
                    disabled={!supportText.trim() || supportSent}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-background border-2 border-brand-orange text-brand-orange hover:bg-brand-orange-soft/40 rounded-full font-bold text-sm transition-all disabled:opacity-50"
                  >
                    {supportSent ? (
                      <>
                        <Check className="w-4 h-4" strokeWidth={3} />
                        Enviado
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar solicitação
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-muted-foreground px-4">
                    A equipe da Evollutti receberá seu pedido e notificará sobre as alterações.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Approved flash overlay */}
      <AnimatePresence>
        {justApproved ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center pointer-events-none z-50"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="h-24 w-24 rounded-full grid place-items-center text-white shadow-[0_20px_60px_-10px_oklch(0.68_0.17_150/0.6)]"
              style={{ background: "var(--status-approved)" }}
            >
              <Check className="h-12 w-12" strokeWidth={3.5} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </AppFrame>
  );
}

function EditableField({
  icon,
  label,
  value,
  onChange,
  multiline,
  placeholder,
  readOnly,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-hairline p-3.5 focus-within:border-brand-purple/50 transition">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {icon}
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          readOnly={readOnly}
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/60 read-only:cursor-default"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-muted-foreground/60 read-only:cursor-default"
        />
      )}
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
  onChange,
  type,
  readOnly,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: "date" | "time";
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface border border-hairline p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {icon}
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full bg-transparent text-[14px] font-medium outline-none tabular-nums read-only:cursor-default"
      />
    </div>
  );
}

function SecondaryAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-2xl border text-[12.5px] font-medium flex items-center justify-center gap-1.5 active:scale-95 transition ${
        danger
          ? "text-destructive border-destructive/25 bg-destructive/5 hover:bg-destructive/10"
          : "bg-surface border-hairline hover:bg-surface-2"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
