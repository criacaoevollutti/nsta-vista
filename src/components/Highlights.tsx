import { Plus } from "lucide-react";
import { highlights } from "@/lib/mock-data";

export function Highlights() {
  return (
    <div className="px-3 pt-2 pb-4 border-b border-hairline">
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x">
        <div className="flex flex-col items-center gap-1 snap-start shrink-0">
          <div className="h-16 w-16 rounded-full border border-hairline grid place-items-center bg-surface hover:bg-surface-2 transition active:scale-95">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground">Novo</span>
        </div>
        {highlights.map((h) => (
          <div key={h.id} className="flex flex-col items-center gap-1 snap-start shrink-0 group cursor-pointer">
            <div
              className="p-[2px] rounded-full transition-transform group-active:scale-95"
              style={{ background: `linear-gradient(135deg, ${h.tint}, #ffffff55)` }}
            >
              <div className="bg-background p-[2px] rounded-full">
                <img
                  src={h.cover}
                  alt={h.name}
                  className="h-[60px] w-[60px] rounded-full object-cover"
                />
              </div>
            </div>
            <span className="text-[11px] text-foreground/80 max-w-[70px] truncate">{h.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}