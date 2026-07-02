import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";

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
          <h1 className="text-[22px] font-semibold tracking-tight">Acesse com seu PIN</h1>
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

        <Link to="/" className="mt-8 text-center text-[12px] text-muted-foreground hover:text-foreground">
          Voltar
        </Link>
      </div>
    </AppFrame>
  );
}
