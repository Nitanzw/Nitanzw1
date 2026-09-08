"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/// Pantalla de error de la aplicación. Reemplaza el mensaje crudo de Next por
/// algo entendible y ofrece reintentar sin recargar toda la página.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <AlertTriangle className="mx-auto size-12 text-amber-500" />
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Algo salió mal</h1>
      <p className="mt-2 text-ink-500">
        Tuvimos un problema al cargar esta página. Puedes intentarlo de nuevo.
      </p>
      {error.digest && <p className="mt-1 text-xs text-ink-500">Código: {error.digest}</p>}

      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-ink-700 hover:bg-slate-50"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
