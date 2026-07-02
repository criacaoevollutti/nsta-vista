import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppFrame } from "@/components/AppFrame";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Aprovação de Conteúdo" },
      { name: "description", content: "Acesse com o PIN enviado pela nossa equipe." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Falha ao entrar com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <AppFrame>
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <div
            className="mx-auto h-14 w-14 rounded-2xl grid place-items-center text-white mb-4"
            style={{ background: "var(--gradient-brand)" }}
          >
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Acesse com seu PIN
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            Digite o PIN de 4 dígitos enviado pela nossa equipe para visualizar seu feed.
          </p>
        </div>

        <Link
          to="/acessar"
          className="w-full h-12 rounded-2xl font-semibold text-[15px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition"
          style={{ background: "var(--gradient-brand)" }}
        >
          <KeyRound className="h-4 w-4" /> Digitar PIN
        </Link>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-hairline" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">área da equipe</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="h-11 rounded-2xl border border-hairline bg-surface hover:bg-surface-2 text-[14px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
        >
          <GoogleIcon />
          Entrar como administrador
        </button>

        <Link to="/" className="mt-8 text-center text-[12px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          <LogIn className="h-3 w-3 rotate-180" /> Voltar
        </Link>
      </div>
    </AppFrame>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.98 6.98 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
