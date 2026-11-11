"use client";

import { useCallback, useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

const ASPECTS = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[16/10]",
  card: "aspect-[16/10]",
  portrait: "aspect-[4/5]",
};

/**
 * Vehicle image with graceful fallback — never invents URLs.
 * Uses API `image_url` only; on missing/broken image shows a neutral placeholder.
 */
export function VehicleImage({
  src,
  alt = "Vehicle",
  className,
  imageClassName,
  iconClassName,
  aspect = "video",
  showFallbackLabel = true,
  eager = false,
  onStatusChange,
}) {
  const [state, setState] = useState({ src, status: src ? "loading" : "empty" });

  if (state.src !== src) {
    setState({ src, status: src ? "loading" : "empty" });
  }

  const status = state.src === src ? state.status : src ? "loading" : "empty";

  const update = useCallback(
    (next) => {
      setState((current) =>
        current.src === src && current.status !== next
          ? { src, status: next }
          : current
      );
      onStatusChange?.(next);
    },
    [onStatusChange, src]
  );

  const imgRef = useCallback(
    (node) => {
      if (!node || !node.complete) return;
      update(node.naturalWidth > 0 ? "loaded" : "error");
    },
    [update]
  );

  const showImage = Boolean(src) && status !== "error";

  return (
    <div
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--sage),var(--surface))]",
        aspect ? ASPECTS[aspect] : null,
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          onLoad={() => update("loaded")}
          onError={() => update("error")}
        />
      ) : null}

      {status !== "loaded" ? (
        <div
          className={cn(
            "flex flex-col items-center gap-2 text-primary/35",
            status === "loading" && "animate-pulse"
          )}
          aria-hidden={status === "loading" ? "true" : undefined}
        >
          <Car className={cn("size-12 stroke-[1.25]", iconClassName)} aria-hidden="true" />
          {showFallbackLabel && status !== "loading" ? (
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              Image unavailable
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
