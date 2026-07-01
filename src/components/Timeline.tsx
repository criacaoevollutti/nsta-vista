import { usePosts } from "@/lib/store";
import { MediaThumb } from "@/components/MediaThumb";
import { STATUS_META } from "@/lib/types";
import { CalendarDays } from "lucide-react";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmt(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { day: d, month: MONTHS[m - 1], year: y };
}

export function Timeline() {
  const posts = usePosts((s) => s.posts);
  return (
    <section className="px-5 pt-6 pb-24">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold tracking-tight uppercase text-muted-foreground">
          Cronograma
        </h2>
      </div>
      <ol className="relative border-l border-hairline ml-2">
        {posts.map((p) => {
          const d = fmt(p.date);
          const s = STATUS_META[p.status];
          return (
            <li key={p.id} className="pl-4 py-2.5 relative">
              <span
                className={`absolute -left-[5px] top-4 h-[9px] w-[9px] rounded-full ring-4 ring-background ${s.dot}`}
              />
              <div className="flex items-center gap-3">
                <MediaThumb src={p.thumb} className="h-11 w-11 rounded-lg object-cover shrink-0" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">{p.title}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">
                    {d.day} {d.month} · {p.time}
                  </div>
                </div>
                <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                  {s.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}