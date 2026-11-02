"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

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
}) {
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/80",
        aspect === "video" && "aspect-video",
        aspect === "square" && "aspect-square",
        aspect === "wide" && "aspect-[16/10]",
        className
      )}
    >
      {hasSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Car
            className={cn("size-16", iconClassName)}
            aria-hidden="true"
          />
          {showFallbackLabel ? (
            <span className="text-xs font-medium tracking-wide text-slate-500">
              No image available
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
