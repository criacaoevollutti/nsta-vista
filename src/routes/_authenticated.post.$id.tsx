import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
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
  Type,
  X,
} from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { usePosts } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_META, TYPE_LABEL, type PostType } from "@/lib/types";

const MAX_MB = 100;
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);


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
  const duplicate = usePosts((s) => s.duplicate);
  const remove = usePosts((s) => s.remove);

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const patch: Partial<typeof post> = { media: signed.signedUrl, thumb: signed.signedUrl };
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

  const approve = () => {
    setStatus(post.id, "approved");
    setJustApproved(true);
    setTimeout(() => setJustApproved(false), 1400);
  };

  const sendSupport = () => {
    if (!supportText.trim()) return;
    setStatus(post.id, "revision");
    update(post.id, { notes: post.notes ? `${post.notes}\n— ${supportText}` : supportText });
    setSupportSent(true);
    setTimeout(() => {
      setSupportOpen(false);
      setSupportSent(false);
      setSupportText("");
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
          <button
            onClick={() => duplicate(post.id)}
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
            title="Duplicar"
          >
            <Copy className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        {/* Media */}
        <motion.div
          layoutId={`media-${post.id}`}
          className={`relative w-full bg-surface-2 ${post.type === "reel" || post.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]"}`}
        >
          <img src={post.media} alt={post.title} className="h-full w-full object-cover" />
          {(post.type === "video" || post.type === "reel") ? (
            <div className="absolute inset-0 grid place-items-center">
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

          <button className="absolute bottom-3 right-3 h-9 px-3 rounded-full glass text-[12px] font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] active:scale-95 transition">
            <Pencil className="h-3.5 w-3.5" /> Trocar mídia
          </button>
        </motion.div>

        {/* Editable fields */}
        <div className="p-5 space-y-4">
          <EditableField
            icon={<Type className="h-4 w-4" />}
            label="Título"
            value={post.title}
            onChange={(v) => update(post.id, { title: v })}
          />
          <EditableField
            icon={<MessageSquare className="h-4 w-4" />}
            label="Legenda"
            value={post.caption}
            onChange={(v) => update(post.id, { caption: v })}
            multiline
          />
          <EditableField
            icon={<Target className="h-4 w-4" />}
            label="Objetivo da postagem"
            value={post.objective}
            onChange={(v) => update(post.id, { objective: v })}
          />
          <EditableField
            icon={<Sparkles className="h-4 w-4" />}
            label="Observações internas"
            value={post.notes}
            placeholder="Notas visíveis apenas para a equipe"
            onChange={(v) => update(post.id, { notes: v })}
            multiline
          />

          <div className="grid grid-cols-2 gap-3">
            <MetaField
              icon={<CalendarClock className="h-4 w-4" />}
              label="Data"
              type="date"
              value={post.date}
              onChange={(v) => update(post.id, { date: v })}
            />
            <MetaField
              icon={<CalendarClock className="h-4 w-4" />}
              label="Horário"
              type="time"
              value={post.time}
              onChange={(v) => update(post.id, { time: v })}
            />
          </div>

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
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="absolute bottom-0 inset-x-0 glass border-t border-hairline p-4 pb-6 space-y-2">
        <button
          onClick={approve}
          disabled={post.status === "approved"}
          className={`w-full h-12 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.98] ${
            post.status === "approved"
              ? "bg-success-soft text-status-approved"
              : "bg-status-approved text-white shadow-[0_10px_30px_-12px_oklch(0.68_0.17_150/0.55)]"
          }`}
        >
          <Check className="h-5 w-5" strokeWidth={3} />
          {post.status === "approved" ? "Aprovado" : "Aprovar publicação"}
        </button>
        <button
          onClick={() => setSupportOpen(true)}
          className="w-full h-11 rounded-2xl font-medium text-[14px] flex items-center justify-center gap-2 bg-brand-orange-soft/40 text-brand-orange border border-brand-orange-soft/70 active:scale-[0.98] transition"
        >
          <MessageSquare className="h-4 w-4" />
          Solicitar suporte
        </button>
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

      {/* Support sheet */}
      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        value={supportText}
        onChange={setSupportText}
        sent={supportSent}
        onSend={sendSupport}
      />
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
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
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-muted-foreground/60"
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: "date" | "time";
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
        className="w-full bg-transparent text-[14px] font-medium outline-none tabular-nums"
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

function SupportSheet({
  open,
  onClose,
  value,
  onChange,
  sent,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  sent: boolean;
  onSend: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute bottom-0 inset-x-0 z-50 bg-background rounded-t-3xl p-5 pb-7 shadow-[var(--shadow-lg)]"
          >
            <div className="flex justify-center mb-3">
              <span className="h-1 w-10 rounded-full bg-hairline" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold tracking-tight">Solicitar suporte</h3>
              <button
                onClick={onClose}
                className="h-8 w-8 grid place-items-center rounded-full hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">
              Descreva o que deseja ajustar nesta publicação. A equipe da Evollutti receberá seu pedido.
            </p>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={4}
              placeholder="Ex: gostaria de trocar a foto e ajustar o CTA da legenda…"
              className="w-full resize-none rounded-2xl bg-surface border border-hairline p-3.5 text-[14px] outline-none focus:border-brand-orange/60 transition"
            />
            <button
              onClick={onSend}
              disabled={sent}
              className="mt-4 w-full h-12 rounded-2xl font-semibold text-[14.5px] flex items-center justify-center gap-2 bg-brand-orange text-white active:scale-[0.98] transition disabled:opacity-70"
              style={{ background: "var(--brand-orange)" }}
            >
              {sent ? (
                <>
                  <Check className="h-5 w-5" strokeWidth={3} /> Enviado
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar solicitação
                </>
              )}
            </button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}