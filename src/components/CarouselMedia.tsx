import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoUrl } from "@/lib/utils";

interface CarouselMediaProps {
  cover: string;
  media: string;
  extras: string[];
  alt?: string;
  ratioClass?: string;
}

export function CarouselMedia({ cover, media, extras, alt, ratioClass = "aspect-[4/5]" }: CarouselMediaProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const slides = [cover || media, ...extras.filter(Boolean)];
  const total = slides.length;

  return (
    <div className="relative w-full bg-black">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className="ml-0">
          {slides.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="pl-0">
              <div className={`w-full ${ratioClass} bg-black`}>
                {isVideoUrl(src) ? (
                  <video src={src} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
                ) : (
                  <img src={src} alt={alt ? `${alt} ${i + 1}` : `slide ${i + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {total > 1 ? (
        <>
          {index > 0 ? (
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => api?.scrollPrev()}
              className="absolute top-1/2 left-2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/95 hover:bg-white text-neutral-900 flex items-center justify-center shadow-md transition z-10"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
          ) : null}
          {index < total - 1 ? (
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => api?.scrollNext()}
              className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/95 hover:bg-white text-neutral-900 flex items-center justify-center shadow-md transition z-10"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          ) : null}
          <div className="absolute top-3 right-3 h-6 px-2 rounded-full bg-black/55 text-white text-[11px] font-semibold flex items-center pointer-events-none">
            {index + 1}/{total}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-1.5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
