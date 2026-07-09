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
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => api?.scrollPrev()}
            className="absolute top-1/2 left-2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => api?.scrollNext()}
            className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute top-3 right-3 h-7 px-2 rounded-full bg-black/50 text-white text-[11px] font-medium flex items-center">
            {index + 1}/{total}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
