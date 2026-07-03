import { Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { highlights } from "@/lib/mock-data";
import { EditableText } from "@/components/EditableText";
import { supabase } from "@/integrations/supabase/client";

type Dict = Record<string, string>;

interface HighlightsProps {
  scopeId?: string;
  readOnly?: boolean;
  /** When provided (PIN/token flows), seed initial data instead of fetching. */
  initialNames?: Dict;
  initialCovers?: Dict;
  /** Admin PIN — if provided, saves via admin RPC instead of RLS-authenticated update. */
  adminPin?: string;
}

async function resizeImageToDataUrl(file: File, max = 256): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("img"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function Highlights({ scopeId, readOnly = false, initialNames, initialCovers, adminPin }: HighlightsProps) {
  const [covers, setCovers] = useState<Dict>(initialCovers ?? {});
  const [names, setNames] = useState<Dict>(initialNames ?? {});
  const [saving, setSaving] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (initialNames || initialCovers) {
      setNames(initialNames ?? {});
      setCovers(initialCovers ?? {});
      return;
    }
    if (!scopeId) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("highlight_names, highlight_covers")
      .eq("id", scopeId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setNames((data.highlight_names as Dict) ?? {});
        setCovers((data.highlight_covers as Dict) ?? {});
      });
    return () => {
      cancelled = true;
    };
  }, [scopeId, initialNames, initialCovers]);

  if (!scopeId) return null;

  const persist = async (nextNames: Dict, nextCovers: Dict) => {
    if (adminPin) {
      const { data, error } = await supabase.rpc("admin_update_highlights", {
        _admin_pin: adminPin,
        _target_id: scopeId,
        _names: nextNames,
        _covers: nextCovers,
      });
      if (error || !data) throw error ?? new Error("update failed");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ highlight_names: nextNames, highlight_covers: nextCovers })
      .eq("id", scopeId);
    if (error) throw error;
  };

  const renameHighlight = async (id: string, next: string) => {
    const updated = { ...names, [id]: next };
    setNames(updated);
    try {
      await persist(updated, covers);
    } catch {
      toast.error("Não foi possível salvar o nome");
    }
  };

  const pick = async (id: string, file: File) => {
    setSaving(id);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      const next = { ...covers, [id]: dataUrl };
      setCovers(next);
      await persist(names, next);
    } catch {
      toast.error("Não foi possível salvar a capa");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="px-3 pt-2 pb-4 border-b border-hairline">
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x">
        {highlights.map((h) => {
          const cover = covers[h.id] || h.cover;
          return (
            <div key={h.id} className="flex flex-col items-center gap-1 snap-start shrink-0 group">
              <div className="relative">
                <div
                  className="p-[2px] rounded-full transition-transform group-active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${h.tint}, #ffffff55)` }}
                >
                  <div className="bg-background p-[2px] rounded-full">
                    <img
                      src={cover}
                      alt={h.name}
                      className="h-[60px] w-[60px] rounded-full object-cover"
                    />
                  </div>
                </div>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => inputs.current[h.id]?.click()}
                      aria-label={`Trocar capa de ${h.name}`}
                      title="Trocar capa"
                      className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-foreground text-background grid place-items-center border-2 border-background shadow-sm hover:scale-105 active:scale-95 transition"
                    >
                      {saving === h.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Pencil className="h-2.5 w-2.5" />
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        inputs.current[h.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void pick(h.id, f);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>
              {readOnly ? (
                <span className="text-[11px] text-foreground/80 max-w-[70px] truncate block text-center">
                  {names[h.id] ?? h.name}
                </span>
              ) : (
                <EditableText
                  as="span"
                  value={names[h.id] ?? h.name}
                  onChange={(v) => void renameHighlight(h.id, v || h.name)}
                  className="text-[11px] text-foreground/80 max-w-[70px] truncate block text-center"
                  placeholder="Nome"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
