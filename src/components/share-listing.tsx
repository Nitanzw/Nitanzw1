"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/// Compartir un aviso. En Chile un aviso se manda por WhatsApp antes que por
/// cualquier otra cosa, así que ese botón va primero y explícito.
export function ShareListing({ title, price }: { title: string; price: string }) {
  const [copiado, setCopiado] = useState(false);

  const url = typeof window === "undefined" ? "" : window.location.href;
  const texto = `${title} — ${price}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: quedan los otros botones.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
      >
        <Share2 className="size-4" /> Compartir por WhatsApp
      </a>

      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink-700 hover:bg-slate-50"
      >
        {copiado ? <Check className="size-4 text-brand-600" /> : <Link2 className="size-4" />}
        {copiado ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
