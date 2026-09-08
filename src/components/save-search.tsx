"use client";

import { useActionState, useState } from "react";
import { BellPlus } from "lucide-react";
import { saveSearchAction } from "@/app/actions/saved-searches";

export function SaveSearch({ query, suggestedName }: { query: string; suggestedName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveSearchAction, undefined);

  if (state?.ok) {
    return <p className="text-sm text-brand-700">Búsqueda guardada en tu cuenta.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-brand-300 hover:text-brand-700"
      >
        <BellPlus className="size-4" /> Guardar búsqueda
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="query" value={query} />
      <input
        name="name"
        defaultValue={suggestedName}
        maxLength={80}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        aria-label="Nombre de la búsqueda"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {state?.error && <span className="text-sm text-red-700">{state.error}</span>}
    </form>
  );
}
