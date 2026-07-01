import { isVideoUrl } from "@/lib/utils";
import { Play } from "lucide-react";

interface MediaThumbProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  showPlayIcon?: boolean;
}

export function MediaThumb({ src, alt, className, showPlayIcon }: MediaThumbProps) {
  if (!src) {
    return <div className={className + " bg-surface-2"} />;
  }

  const isVideo = isVideoUrl(src);

  if (isVideo) {
    return (
      <div className={"relative overflow-hidden " + className}>
        <video
          src={src}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
          playsInline
        />
        {showPlayIcon && (
          <div className="absolute inset-0 grid place-items-center bg-black/10">
            <div className="h-8 w-8 rounded-full bg-white/30 backdrop-blur-sm grid place-items-center">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
