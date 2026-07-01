import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppFrame } from "@/components/AppFrame";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Aprovação de Conteúdo" },
      { name: "description", content: "Acesse sua conta para gerenciar o feed de aprovação de conteúdo." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce home.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se necessário.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

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
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {mode === "signin" ? "Bem-vindo de volta" : "Criar sua conta"}
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            {mode === "signin"
              ? "Entre para gerenciar seu feed de aprovação."
              : "Comece a organizar seu conteúdo agora."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="h-11 rounded-2xl border border-hairline bg-surface hover:bg-surface-2 text-[14px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-hairline" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full h-11 px-3.5 rounded-2xl bg-surface border border-hairline text-[14px] outline-none focus:border-brand-purple/50 transition"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Senha
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full h-11 px-3.5 rounded-2xl bg-surface border border-hairline text-[14px] outline-none focus:border-brand-purple/50 transition"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full h-12 rounded-2xl font-semibold text-[15px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mode === "signin" ? (
              <>
                <LogIn className="h-4 w-4" /> Entrar
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Criar conta
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 text-center text-[13px] text-muted-foreground hover:text-foreground transition"
        >
          {mode === "signin" ? (
            <>
              Não tem conta? <span className="text-brand-purple font-medium">Criar agora</span>
            </>
          ) : (
            <>
              Já tem conta? <span className="text-brand-purple font-medium">Entrar</span>
            </>
          )}
        </button>

        <Link to="/" className="mt-8 text-center text-[12px] text-muted-foreground hover:text-foreground">
          Voltar
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
