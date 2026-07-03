import { Bell, ChevronLeft, MoreHorizontal } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface TopBarProps {
  title: string;
  back?: boolean;
  subtitle?: string;
  right?: React.ReactNode;
}

export function TopBar({ title, back, subtitle, right }: TopBarProps) {
  return (
    <div className="sticky top-0 z-40 glass border-b border-hairline">
      <div className="flex items-center justify-between h-16 px-5 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {back ? (
            <Link
              to="/"
              className="-ml-2 h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <div className="font-semibold tracking-tight truncate text-[17px] leading-tight">
              {title}
            </div>
            {subtitle ? (
              <div className="text-[11px] text-muted-foreground truncate">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {right ?? (
            <>
              <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition">
                <Bell className="h-[18px] w-[18px]" />
              </button>
              <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 active:scale-95 transition">
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}