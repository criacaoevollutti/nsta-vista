import { MapPin, Link2, BadgeCheck } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { EditableText } from "./EditableText";

export function ProfileHeader({
  approvedCount,
  total,
  editable = false,
}: {
  approvedCount: number;
  total: number;
  editable?: boolean;
}) {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const progress = Math.round((approvedCount / total) * 100);
  return (
    <section className="px-5 pt-4 pb-2">
      {/* Avatar + counts */}
      <div className="flex items-center gap-5">
        <div className="story-ring shrink-0">
          <div className="bg-background p-[2px] rounded-full">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-[86px] w-[86px] rounded-full object-cover"
            />
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1 text-center">
          <Stat value={total.toString()} label="posts" />
          <Stat
            value={profile.followers}
            label="seguidores"
            editable={editable}
            onChange={(followers) => update({ followers })}
          />
          <Stat
            value={profile.following.toString()}
            label="seguindo"
            editable={editable}
            onChange={(v) => update({ following: Number(v.replace(/\D/g, "")) || 0 })}
          />
        </div>
      </div>

      {/* Identity */}
      <div className="mt-4">
        <div className="flex items-center gap-1.5">
          <EditableText
            as="h1"
            value={profile.name}
            onChange={(name) => update({ name })}
            className="text-[15px] font-semibold tracking-tight"
          />
          <BadgeCheck className="h-4 w-4 text-brand-purple" fill="currentColor" strokeWidth={0} />
        </div>
        <EditableText
          as="div"
          value={profile.category}
          onChange={(category) => update({ category })}
          className="text-[13px] text-muted-foreground mt-0.5"
        />
        <EditableText
          as="p"
          multiline
          value={profile.bio}
          onChange={(bio) => update({ bio })}
          className="text-[13.5px] mt-2 leading-snug whitespace-pre-line block"
        />
        <div className="flex items-center gap-1 mt-1.5 text-[13px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <EditableText
            value={profile.location}
            onChange={(location) => update({ location })}
          />
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[13px] text-brand-purple font-medium">
          <Link2 className="h-3.5 w-3.5" />
          <EditableText
            value={profile.site}
            onChange={(site) => update({ site })}
          />
        </div>
      </div>




      {/* Approval progress — subtle premium touch */}
      <div className="mt-5 p-3 rounded-2xl bg-surface border border-hairline">
        <div className="flex items-center justify-between text-[12px] mb-2">
          <span className="font-medium text-foreground">Ciclo de aprovação</span>
          <span className="tabular-nums text-muted-foreground">{approvedCount}/{total} aprovadas</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%`, background: "var(--gradient-brand)" }}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  editable,
  onChange,
}: {
  value: string;
  label: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[16px] font-semibold tabular-nums leading-none">
        {editable && onChange ? (
          <EditableText value={value} onChange={onChange} />
        ) : (
          value
        )}
      </div>
      <div className="text-[12px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function CTA({ icon, label, primary }: { icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <button
      className={`h-9 rounded-full text-[12.5px] font-medium flex items-center justify-center gap-1.5 border transition active:scale-[0.97] ${
        primary
          ? "text-white border-transparent shadow-[var(--shadow-glow-purple)]"
          : "bg-surface hover:bg-surface-2 border-hairline text-foreground"
      }`}
      style={primary ? { background: "var(--gradient-brand)" } : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}