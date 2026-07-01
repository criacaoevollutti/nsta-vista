import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { createClientCompany, updateClientPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Evollutti" }] }),
  component: AdminPage,
});

type Row = {
  id: string;
  name: string;
  handle: string;
  share_token: string;
  updated_at: string;
  post_count: number;
  email: string | null;
  password: string | null;
};

function AdminPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, loading } = useIsAdmin(user.id);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const createFn = useServerFn(createClientCompany);
  const updatePwFn = useServerFn(updateClientPassword);

  const load = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,name,handle,share_token,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar clientes");
      return;
    }
    const list = profiles ?? [];
    const [counts, creds] = await Promise.all([
      Promise.all(
        list.map((p) =>
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.id)
            .then(({ count }) => count ?? 0),
        ),
      ),
      supabase.from("client_credentials").select("user_id,email,password"),
    ]);
    const credMap = new Map((creds.data ?? []).map((c) => [c.user_id, c]));
    setRows(
      list.map((p, i) => ({
        ...(p as Omit<Row, "post_count" | "email" | "password">),
        post_count: counts[i],
        email: credMap.get(p.id)?.email ?? null,
        password: credMap.get(p.id)?.password ?? null,
      })),
    );
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  if (loading) {
    return (
      <AppFrame>
        <div className="flex-1 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppFrame>
    );
  }

  if (!isAdmin) {
    return (
      <AppFrame>
        <TopBar
          title="Acesso restrito"
          right={
            <button onClick={() => navigate({ to: "/" })} className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
          }
        />
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div className="max-w-xs space-y-3">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Apenas o admin da agência pode acessar esta página.
            </p>
          </div>
        </div>
      </AppFrame>
    );
  }

  const copyText = async (text: string, label = "Copiado") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const resetPassword = async (userId: string) => {
    const pw = window.prompt("Nova senha (mín. 6 caracteres):");
    if (!pw) return;
    try {
      await updatePwFn({ data: { userId, password: pw } });
      toast.success("Senha atualizada");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar");
    }
  };

  return (
    <AppFrame>
      <TopBar
        title="Empresas"
        subtitle="Credenciais e links de acesso"
        right={
          <button onClick={() => navigate({ to: "/" })} className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> {showForm ? "Fechar" : "Nova empresa"}
        </button>

        {showForm ? (
          <CreateForm
            onCreate={async (payload) => {
              try {
                await createFn({ data: payload });
                toast.success("Empresa criada");
                setShowForm(false);
                void load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao criar");
              }
            }}
          />
        ) : null}

        {rows === null ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhuma empresa cadastrada ainda.
          </p>
        ) : (
          rows.map((r) => {
            const url = `${window.location.origin}/c/${r.share_token}`;
            const isVisible = visible[r.id];
            return (
              <div key={r.id} className="rounded-2xl border border-hairline bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.name || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground">@{r.handle}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">
                    {r.post_count}/12 posts
                  </span>
                </div>

                {r.email ? (
                  <div className="rounded-lg bg-surface-2 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono truncate">{r.email}</span>
                        <button onClick={() => copyText(r.email!, "Email copiado")} className="p-1 hover:bg-surface rounded">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Senha</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono truncate">
                          {isVisible ? r.password : "••••••••"}
                        </span>
                        <button
                          onClick={() => setVisible((v) => ({ ...v, [r.id]: !v[r.id] }))}
                          className="p-1 hover:bg-surface rounded"
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button onClick={() => copyText(r.password ?? "", "Senha copiada")} className="p-1 hover:bg-surface rounded">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button onClick={() => resetPassword(r.id)} className="p-1 hover:bg-surface rounded" title="Redefinir senha">
                          <KeyRound className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyText(
                          `Acesse: ${window.location.origin}/auth\nEmail: ${r.email}\nSenha: ${r.password}`,
                          "Credenciais copiadas",
                        )
                      }
                      className="w-full mt-1 h-8 rounded-lg bg-foreground text-background text-xs font-medium inline-flex items-center justify-center gap-1.5"
                    >
                      <Copy className="h-3 w-3" /> Copiar tudo para enviar
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-surface-2 p-2.5 text-xs text-muted-foreground">
                    Sem credenciais salvas (cliente antigo). Use o link público abaixo ou redefina a senha.
                  </div>
                )}

                <div className="text-[10px] font-mono bg-surface-2 rounded-lg p-2 break-all text-muted-foreground">
                  Link público: {url}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => copyText(url, "Link copiado")}
                    className="h-9 rounded-full border border-hairline text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" /> Link
                  </button>
                  <Link
                    to="/c/$token"
                    params={{ token: r.share_token }}
                    target="_blank"
                    className="h-9 rounded-full border border-hairline text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Link>
                  <Link
                    to="/admin/edit/$userId"
                    params={{ userId: r.id }}
                    className="h-9 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppFrame>
  );
}

function CreateForm({
  onCreate,
}: {
  onCreate: (p: { email: string; password: string; name: string; handle: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate({ name, handle, email, password });
      setName("");
      setHandle("");
      setEmail("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const genPw = () => {
    const pw = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
    setPassword(pw);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-hairline bg-card p-4 space-y-2">
      <div className="text-sm font-semibold mb-1">Nova empresa</div>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da empresa"
        className="w-full h-10 px-3 rounded-lg bg-surface-2 text-sm outline-none"
      />
      <input
        required
        value={handle}
        onChange={(e) => setHandle(e.target.value.toLowerCase())}
        placeholder="handle (ex: minhaempresa)"
        className="w-full h-10 px-3 rounded-lg bg-surface-2 text-sm outline-none font-mono"
      />
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email de acesso do cliente"
        className="w-full h-10 px-3 rounded-lg bg-surface-2 text-sm outline-none"
      />
      <div className="flex gap-2">
        <input
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="senha (mín. 6)"
          className="flex-1 h-10 px-3 rounded-lg bg-surface-2 text-sm outline-none font-mono"
        />
        <button
          type="button"
          onClick={genPw}
          className="px-3 h-10 rounded-lg border border-hairline text-xs"
        >
          Gerar
        </button>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Criar empresa
      </button>
    </form>
  );
}
