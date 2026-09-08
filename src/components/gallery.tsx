"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function Gallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-16/10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300">
        <ImageIcon className="size-16" />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]?.url}
          alt={title}
          className="aspect-16/10 w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              className={`size-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                index === active ? "border-brand-500" : "border-transparent"
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
