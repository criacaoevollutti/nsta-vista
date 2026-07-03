import { Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { highlights } from "@/lib/mock-data";
import { EditableText } from "@/components/EditableText";

const namesKey = (scope: string) => `highlight-names:${scope}`;
const coversKey = (scope: string) => `highlight-covers:${scope}`;

function loadJSON(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function Highlights({ scopeId, readOnly = false }: { scopeId?: string; readOnly?: boolean }) {
  const scope = scopeId || "default";
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setCovers(loadJSON(coversKey(scope)));
    setNames(loadJSON(namesKey(scope)));
  }, [scope]);

  const renameHighlight = (id: string, next: string) => {
    const updated = { ...names, [id]: next };
    setNames(updated);
    try {
      window.localStorage.setItem(namesKey(scope), JSON.stringify(updated));
    } catch {
      /* ignore quota */
    }
  };


  const pick = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...covers, [id]: String(reader.result) };
      setCovers(next);
      try {
        window.localStorage.setItem(coversKey(scope), JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="px-3 pt-2 pb-4 border-b border-hairline">
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x">
        <div className="flex flex-col items-center gap-1 snap-start shrink-0">
          <div className="h-16 w-16 rounded-full border border-hairline grid place-items-center bg-surface hover:bg-surface-2 transition active:scale-95">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground">Novo</span>
        </div>
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
                <button
                  type="button"
                  onClick={() => inputs.current[h.id]?.click()}
                  aria-label={`Trocar capa de ${h.name}`}
                  title="Trocar capa"
                  className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-foreground text-background grid place-items-center border-2 border-background shadow-sm hover:scale-105 active:scale-95 transition"
                >
                  <Pencil className="h-2.5 w-2.5" />
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
                    if (f) pick(h.id, f);
                    e.target.value = "";
                  }}
                />
              </div>
              <EditableText
                as="span"
                value={names[h.id] ?? h.name}
                onChange={(v) => renameHighlight(h.id, v || h.name)}
                className="text-[11px] text-foreground/80 max-w-[70px] truncate block text-center"
                placeholder="Nome"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
