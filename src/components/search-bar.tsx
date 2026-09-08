"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      className={`flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand-400 focus-within:bg-white ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const q = String(form.get("q") ?? "").trim();
        const next = new URLSearchParams();
        if (q) next.set("q", q);
        const categoria = params.get("categoria");
        if (categoria) next.set("categoria", categoria);
        router.push(`/buscar?${next.toString()}`);
      }}
    >
      <Search className="size-5 shrink-0 text-ink-500" />
      <input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder="¿Qué estás buscando?"
        className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
        aria-label="Buscar avisos"
      />
      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Buscar
      </button>
    </form>
  );
}
