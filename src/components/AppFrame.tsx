import { type ReactNode } from "react";

/**
 * Mobile-first shell — clamps the whole app to a phone-sized column even
 * when opened on desktop. Everything renders inside this frame.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-surface flex justify-center">
      <div className="relative w-full max-w-[440px] bg-background min-h-screen shadow-[0_0_60px_-20px_rgba(0,0,0,0.15)] flex flex-col">
        {children}
      </div>
    </div>
  );
}