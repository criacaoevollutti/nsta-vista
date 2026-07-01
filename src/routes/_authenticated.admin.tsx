import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
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
import { createClientCompany, deleteClientCompany } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Evollutti" }] }),
  component: AdminPage,
});

type Row = {
  id: string;
  name: string;
  handle: string;
  access_pin: string;
  updated_at: string;
  post_count: number;
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
  const createFn = useServerFn(createClientCompany);
  const deleteFn = useServerFn(deleteClientCompany);

  const load = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,name,handle,access_pin,updated_at")
      .order("updated_at", { ascending: false });
    if (error) return toast.error("Erro ao carregar clientes");
    const list = profiles ?? [];
    const counts = await Promise.all(
      list.map((p) =>
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", p.id).then(({ count }) => count ?? 0),
      ),
    );
    setRows(list.map((p, i) => ({ ...(p as Omit<Row, "post_count">), post_count: counts[i] })));
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.handle.toLowerCase().includes(q) ||
        r.access_pin.includes(q),
    );
  }, [rows, query]);

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
    if (!window.confirm(`Excluir "${row.name}" e todos os posts? Ação irreversível.`)) return;
    try {
      await deleteFn({ data: { userId: row.id } });
      toast.success("Empresa excluída");
      setSelectedId(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
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

          {filtered === null ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: PURPLE }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {filtered.map((r) => {
                const isSel = r.id === selectedId;
                return (
                  <li key={r.id}>
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        isSel ? "border-transparent shadow-lg" : "border-slate-200 hover:border-violet-300 bg-white"
                      }`}
                      style={
                        isSel
                          ? {
                              background: "linear-gradient(135deg,#faf5ff,#fff7ed)",
                              boxShadow: `0 8px 24px -12px ${PURPLE}55`,
                            }
                          : undefined
                      }
                    >
                      <button onClick={() => setSelectedId(r.id)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{r.name || "Sem nome"}</div>
                            <div className="text-xs text-slate-500 truncate">@{r.handle}</div>
                          </div>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: "#fff7ed", color: ORANGE }}
                          >
                            {r.post_count}/12
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400">PIN</div>
                          <div className="font-mono text-lg font-bold tracking-[0.3em]" style={{ color: PURPLE }}>
                            {r.access_pin}
                          </div>
                        </div>
                      </button>
                      <Link
                        to="/admin/edit/$userId"
                        params={{ userId: r.id }}
                        className="mt-3 w-full h-9 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 text-white"
                        style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ORANGE})` }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Abrir editor
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
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
              try {
                const res = await createFn({ data: payload });
                toast.success(`Empresa criada · PIN ${res.pin}`);
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
        <div className="text-xs text-slate-500">@{row.handle}</div>
      </div>

      <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg,#faf5ff,#fff7ed)" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PIN de acesso</div>
        <div className="mt-1 font-mono text-4xl font-bold tracking-[0.4em]" style={{ color: PURPLE }}>
          {row.access_pin}
        </div>
        <div className="mt-3 flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => onCopy(row.access_pin, "PIN copiado")}
            className="h-9 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-violet-300"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar PIN
          </button>
          <button
            onClick={() => onCopy(accessUrl, "Link copiado")}
            className="h-9 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-violet-300"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar link
          </button>
          <button
            onClick={() => onCopy(message, "Mensagem copiada")}
            className="h-9 px-4 rounded-full text-xs font-medium text-white inline-flex items-center gap-1.5"
            style={{ background: ORANGE }}
          >
            <Copy className="h-3.5 w-3.5" /> Link + PIN
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
