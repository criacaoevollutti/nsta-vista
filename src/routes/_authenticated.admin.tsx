import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Evollutti" }] }),
  component: AdminPage,
});

type ApprovalKey = "pending" | "approved" | "changes_requested";
type Row = {
  id: string;
  name: string;
  handle: string;
  access_pin: string;
  updated_at: string;
  position: number | null;
  is_admin: boolean;
  post_count: number;
  approval_counts: Record<ApprovalKey, number>;
};

const PURPLE = "#7c3aed";
const ORANGE = "#f97316";

function AdminPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, loading } = useIsAdmin(user.id);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [showAdmins, setShowAdmins] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("admins");
      if (q === "1") return true;
      if (q === "0") return false;
      return localStorage.getItem("admin.showAdmins") === "1";
    } catch { return false; }
  });
  const [approvalFilter, setApprovalFilter] = useState<"all" | ApprovalKey>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("approval");
      if (q === "pending" || q === "approved" || q === "changes_requested" || q === "all") return q as "all" | ApprovalKey;
      const v = localStorage.getItem("admin.approvalFilter");
      return v === "pending" || v === "approved" || v === "changes_requested" ? v : "all";
    } catch { return "all"; }
  });
  const [countFilter, setCountFilter] = useState<"all" | "with" | "without" | "full">(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("posts");
      if (q === "with" || q === "without" || q === "full" || q === "all") return q;
      const v = localStorage.getItem("admin.countFilter");
      return v === "with" || v === "without" || v === "full" ? v : "all";
    } catch { return "all"; }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin.showAdmins", showAdmins ? "1" : "0");
      localStorage.setItem("admin.approvalFilter", approvalFilter);
      localStorage.setItem("admin.countFilter", countFilter);
      const url = new URL(window.location.href);
      const setOrDel = (k: string, v: string, def: string) => {
        if (v === def) url.searchParams.delete(k);
        else url.searchParams.set(k, v);
      };
      setOrDel("admins", showAdmins ? "1" : "0", "0");
      setOrDel("approval", approvalFilter, "all");
      setOrDel("posts", countFilter, "all");
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch {}
  }, [showAdmins, approvalFilter, countFilter]);


  useEffect(() => {
    if (!isAdmin) return;
    void supabase
      .from("profiles")
      .select("access_pin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setAdminPin(data?.access_pin ?? null));
  }, [isAdmin, user.id]);


  const load = async () => {
    const [{ data: profiles, error }, { data: postRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,handle,access_pin,updated_at,position,is_admin")
        .order("position", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false }),
      supabase.from("posts").select("user_id,approval_status"),
    ]);
    if (error) return toast.error("Erro ao carregar clientes");
    const counts = new Map<string, number>();
    const approvals = new Map<string, Record<ApprovalKey, number>>();
    for (const p of postRows ?? []) {
      counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
      const key = (p.approval_status ?? "pending") as ApprovalKey;
      const cur = approvals.get(p.user_id) ?? { pending: 0, approved: 0, changes_requested: 0 };
      if (key === "pending" || key === "approved" || key === "changes_requested") cur[key] += 1;
      approvals.set(p.user_id, cur);
    }
    setRows(
      (profiles ?? []).map((p) => ({
        ...(p as Omit<Row, "post_count" | "approval_counts">),
        post_count: counts.get(p.id) ?? 0,
        approval_counts: approvals.get(p.id) ?? { pending: 0, approved: 0, changes_requested: 0 },
      })),
    );
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showAdmins && r.is_admin) return false;
      if (q && !(r.name.toLowerCase().includes(q) || r.handle.toLowerCase().includes(q) || r.access_pin.includes(q))) return false;
      if (approvalFilter !== "all" && (r.approval_counts[approvalFilter] ?? 0) === 0) return false;
      if (countFilter === "with" && r.post_count === 0) return false;
      if (countFilter === "without" && r.post_count > 0) return false;
      if (countFilter === "full" && r.post_count < 12) return false;
      return true;
    });
  }, [rows, query, showAdmins, approvalFilter, countFilter]);


  const selected = filtered?.find((r) => r.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: PURPLE }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-white p-6 text-center">
        <div className="max-w-xs space-y-3">
          <ShieldAlert className="h-8 w-8 mx-auto text-slate-400" />
          <p className="text-sm text-slate-500">Apenas o admin da agência pode acessar esta página.</p>
        </div>
      </div>
    );
  }

  const copyText = async (text: string, label = "Copiado") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const removeCompany = async (row: Row) => {
    if (!adminPin) { toast.error("PIN de admin indisponível"); return; }
    if (!window.confirm(`Excluir "${row.name}" e todos os posts? Ação irreversível.`)) return;
    try {
      const { data, error } = await supabase.rpc("admin_delete_profile", {
        _admin_pin: adminPin,
        _target_id: row.id,
      });
      if (error) throw error;
      if (!data) throw new Error("Falha ao excluir");
      toast.success("Empresa excluída");
      setSelectedId(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const canReorder = query.trim() === "" && approvalFilter === "all" && countFilter === "all" && !showAdmins;

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!rows || !e.over || e.active.id === e.over.id) return;
    if (!adminPin) { toast.error("PIN de admin indisponível"); return; }
    const oldIdx = rows.findIndex((r) => r.id === e.active.id);
    const newIdx = rows.findIndex((r) => r.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(rows, oldIdx, newIdx);
    setRows(next);
    const { error } = await supabase.rpc("admin_reorder_profiles", {
      _admin_pin: adminPin,
      _profile_ids: next.map((r) => r.id),
    });
    if (error) { toast.error("Falha ao reordenar"); void load(); }
  };




  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="h-9 w-9 grid place-items-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg grid place-items-center text-white"
                style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold leading-none">Painel de empresas</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {rows?.length ?? 0} contas · PIN de 4 dígitos por cliente
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-10 px-4 rounded-full text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm hover:opacity-95"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` }}
          >
            <Plus className="h-4 w-4" /> Nova empresa
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_380px] gap-6">
        <section>
          <div className="relative mb-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, handle ou PIN…"
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:border-violet-400"
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <FilterChip active={showAdmins} onClick={() => setShowAdmins((v) => !v)}>
              {showAdmins ? "Ocultar admins" : "Mostrar admins"}
            </FilterChip>
            <FilterChip active={approvalFilter === "pending"} onClick={() => setApprovalFilter((v) => v === "pending" ? "all" : "pending")}>
              Com pendentes
            </FilterChip>
            <FilterChip active={approvalFilter === "approved"} onClick={() => setApprovalFilter((v) => v === "approved" ? "all" : "approved")}>
              Com aprovados
            </FilterChip>
            <FilterChip active={approvalFilter === "changes_requested"} onClick={() => setApprovalFilter((v) => v === "changes_requested" ? "all" : "changes_requested")}>
              Com alterações
            </FilterChip>
            <FilterChip active={countFilter === "with"} onClick={() => setCountFilter((v) => v === "with" ? "all" : "with")}>
              Com posts
            </FilterChip>
            <FilterChip active={countFilter === "without"} onClick={() => setCountFilter((v) => v === "without" ? "all" : "without")}>
              Sem posts
            </FilterChip>
            <FilterChip active={countFilter === "full"} onClick={() => setCountFilter((v) => v === "full" ? "all" : "full")}>
              Feed cheio (12/12)
            </FilterChip>
            {(showAdmins || approvalFilter !== "all" || countFilter !== "all" || query) ? (
              <button
                onClick={() => { setShowAdmins(false); setApprovalFilter("all"); setCountFilter("all"); setQuery(""); }}
                className="h-8 px-3 rounded-full text-xs text-slate-500 hover:text-slate-700"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>


          {filtered === null ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: PURPLE }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map((r) => r.id)} strategy={rectSortingStrategy}>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {filtered.map((r) => (
                    <SortableCompanyCard
                      key={r.id}
                      row={r}
                      isSelected={r.id === selectedId}
                      canReorder={canReorder}
                      onHover={() => setSelectedId(r.id)}
                      onSelect={() => setSelectedId(r.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>


        <aside className="lg:sticky lg:top-24 h-fit">
          {selected ? (
            <DetailCard row={selected} onCopy={copyText} onDelete={() => removeCompany(selected)} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Selecione uma empresa para ver o PIN e ações.
            </div>
          )}
        </aside>
      </main>

      {showForm ? (
        <Modal onClose={() => setShowForm(false)}>
          <CreateForm
            onCreate={async (payload) => {
              if (!adminPin) { toast.error("PIN de admin indisponível"); return; }

              try {
                const { data, error } = await supabase.rpc("admin_create_profile", {
                  _admin_pin: adminPin,
                  _name: payload.name,
                  _handle: payload.handle,
                });
                if (error) throw error;
                const res = data as { pin?: string; access_pin?: string } | null;
                const pin = res?.access_pin ?? res?.pin ?? "----";
                toast.success(`Empresa criada · PIN ${pin}`);
                setShowForm(false);
                void load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao criar");
              }
            }}

          />
        </Modal>
      ) : null}
    </div>
  );
}

function DetailCard({
  row,
  onCopy,
  onDelete,
}: {
  row: Row;
  onCopy: (t: string, l?: string) => void;
  onDelete: () => void;
}) {
  const accessUrl =
    typeof window !== "undefined" ? `${window.location.origin}/acessar` : "/acessar";
  const message = `Acesse: ${accessUrl}\nSeu PIN: ${row.access_pin}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400">Empresa</div>
        <div className="font-semibold text-lg mt-0.5">{row.name || "Sem nome"}</div>
        <div className="text-xs text-slate-500">@{row.handle.replace(/^@+/, "")}</div>
      </div>

      <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg,#faf5ff,#fff7ed)" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PIN de acesso</div>
        <div className="mt-1 font-mono text-4xl font-bold tracking-[0.4em]" style={{ color: PURPLE }}>
          {row.access_pin}
        </div>
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => onCopy(row.access_pin, "PIN copiado")}
            className="h-9 px-4 rounded-full text-xs font-medium text-white inline-flex items-center gap-1.5"
            style={{ background: ORANGE }}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar PIN
          </button>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/admin/edit/$userId"
          params={{ userId: row.id }}
          className="h-11 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 text-white"
          style={{ background: PURPLE }}
        >
          <Pencil className="h-4 w-4" /> Editar feed
        </Link>
        <button
          onClick={onDelete}
          className="h-11 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" /> Excluir
        </button>
      </div>
      <div className="text-[10px] text-slate-400 text-center">{row.post_count}/12 posts publicados</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function CreateForm({
  onCreate,
}: {
  onCreate: (p: { name: string; handle: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({ name, handle });
      setName("");
      setHandle("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-3">
      <div>
        <div className="text-lg font-semibold">Nova empresa</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Um PIN de 4 dígitos será gerado automaticamente. O cliente acessa em <span className="font-mono">/acessar</span> e digita o PIN — sem login.
        </div>
      </div>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da empresa"
        className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:border-violet-400"
      />
      <input
        required
        value={handle}
        onChange={(e) => setHandle(e.target.value.toLowerCase())}
        placeholder="handle (ex: minhaempresa)"
        className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:border-violet-400 font-mono"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full h-11 rounded-full text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Criar empresa
      </button>
    </form>
  );
}

function SortableCompanyCard({
  row,
  isSelected,
  canReorder,
  onHover,
  onSelect,
}: {
  row: Row;
  isSelected: boolean;
  canReorder: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canReorder,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`p-4 rounded-2xl border transition-all relative ${
          isSelected ? "border-transparent shadow-lg" : "border-slate-200 hover:border-violet-300 bg-white"
        }`}
        style={
          isSelected
            ? {
                background: "linear-gradient(135deg,#faf5ff,#fff7ed)",
                boxShadow: `0 8px 24px -12px ${PURPLE}55`,
              }
            : undefined
        }
      >
        {canReorder ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <Link
          to="/admin/edit/$userId"
          params={{ userId: row.id }}
          preload="intent"
          onMouseEnter={onHover}
          className="block w-full text-left"
        >
          <div className="flex items-start justify-between gap-2 pr-7">
            <div className="min-w-0">
              <div className="font-semibold truncate">{row.name || "Sem nome"}</div>
              <div className="text-xs text-slate-500 truncate">@{row.handle.replace(/^@+/, "")}</div>
            </div>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "#fff7ed", color: ORANGE }}
            >
              {Math.min(row.post_count, 12)}/12
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">PIN</div>
            <div className="font-mono text-lg font-bold tracking-[0.3em]" style={{ color: PURPLE }}>
              {row.access_pin}
            </div>
          </div>
          <div
            className="mt-3 w-full h-9 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` }}
          >
            <Pencil className="h-3.5 w-3.5" /> Abrir editor
          </div>
        </Link>
        <button
          onClick={onSelect}
          className="mt-2 w-full text-[11px] text-slate-500 hover:text-slate-700"
        >
          Ver detalhes
        </button>
      </div>
    </li>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
        active
          ? "text-white border-transparent"
          : "border-slate-200 text-slate-600 bg-white hover:border-violet-300"
      }`}
      style={active ? { background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` } : undefined}
    >
      {children}
    </button>
  );
}
