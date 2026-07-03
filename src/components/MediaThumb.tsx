import { isVideoUrl } from "@/lib/utils";
import { Play } from "lucide-react";

interface MediaThumbProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  showPlayIcon?: boolean;
  /** Force video treatment (e.g. thumb is an image cover for a reel/video). */
  isVideo?: boolean;
}

export function MediaThumb({ src, alt, className, showPlayIcon, isVideo }: MediaThumbProps) {
  if (!src) {
    return <div className={className + " bg-surface-2"} />;
  }

  const treatAsVideo = isVideo ?? isVideoUrl(src);
  const urlIsVideo = isVideoUrl(src);

  if (treatAsVideo) {
    return (
      <div className={"relative overflow-hidden " + className}>
        {urlIsVideo ? (
          <video
            src={src}
            className="h-full w-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        )}
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
