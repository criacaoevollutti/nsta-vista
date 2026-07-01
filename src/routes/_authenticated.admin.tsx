import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

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
};

function AdminPage() {
  const { user } = Route.useRouteContext();
  const { isAdmin, loading } = useIsAdmin(user.id);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    void supabase
      .from("profiles")
      .select("id,name,handle,share_token,updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar clientes");
          return;
        }
        setRows((data ?? []) as Row[]);
      });
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

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/c/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <AppFrame>
      <TopBar
        title="Clientes"
        subtitle="Envie o link de aprovação"
        right={
          <button onClick={() => navigate({ to: "/" })} className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {rows === null ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum cliente cadastrado ainda.
          </p>
        ) : (
          rows.map((r) => {
            const url = `${window.location.origin}/c/${r.share_token}`;
            return (
              <div key={r.id} className="rounded-2xl border border-hairline bg-card p-4 space-y-3">
                <div>
                  <div className="font-semibold">{r.name || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground">@{r.handle}</div>
                </div>
                <div className="text-xs font-mono bg-surface-2 rounded-lg p-2 break-all">
                  {url}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(r.share_token)}
                    className="flex-1 h-9 rounded-full bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </button>
                  <Link
                    to="/c/$token"
                    params={{ token: r.share_token }}
                    target="_blank"
                    className="flex-1 h-9 rounded-full border border-hairline text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
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
