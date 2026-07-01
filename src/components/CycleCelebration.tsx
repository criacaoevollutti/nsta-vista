import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, Sparkles, X } from "lucide-react";
import { usePosts } from "@/lib/store";

export function CycleCelebration() {
  const posts = usePosts((s) => s.posts);
  const celebrated = usePosts((s) => s.celebrated);
  const setCelebrated = usePosts((s) => s.setCelebrated);

  const allApproved =
    posts.length === 12 && posts.every((p) => p.status === "approved" || p.status === "published");
  const show = allApproved && !celebrated;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center px-6"
          style={{ background: "color-mix(in oklab, black 45%, transparent)" }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full max-w-[380px] bg-background rounded-3xl p-6 shadow-[var(--shadow-lg)] relative overflow-hidden"
          >
            <button
              onClick={() => setCelebrated(true)}
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-surface-2 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex justify-center">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: [0, -8, 8, 0], scale: 1 }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.5 }}
                className="h-16 w-16 rounded-2xl grid place-items-center text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                <PartyPopper className="h-8 w-8" />
              </motion.div>
            </div>

            <h3 className="text-center mt-5 text-[20px] font-semibold tracking-tight">
              Ciclo aprovado 🎉
            </h3>
            <p className="text-center text-[13.5px] text-muted-foreground mt-2 leading-relaxed">
              Seu próximo ciclo de conteúdo está aprovado.
              <br />
              Pronto para publicação.
            </p>

            <button
              onClick={() => setCelebrated(true)}
              className="mt-6 w-full h-11 rounded-full text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-[var(--shadow-glow-purple)] active:scale-[0.98] transition"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Sparkles className="h-4 w-4" />
              Continuar
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}