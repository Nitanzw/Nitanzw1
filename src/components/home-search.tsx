"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function HomeSearch({ regions }: { regions: { id: string; name: string }[] }) {
  const router = useRouter();

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        const q = String(form.get("q") ?? "").trim();
        const region = String(form.get("region") ?? "");
        if (q) params.set("q", q);
        if (region) params.set("region", region);
        router.push(`/buscar?${params.toString()}`);
      }}
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        <Search className="size-5 text-ink-500" />
        <input
          name="q"
          placeholder="Auto, departamento, iPhone…"
          aria-label="Qué buscas"
          className="w-full py-2.5 text-ink-900 outline-none placeholder:text-ink-500"
        />
      </div>

      <select
        name="region"
        aria-label="Región"
        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink-700 outline-none sm:w-56"
        defaultValue=""
      >
        <option value="">Todo Chile</option>
        {regions.map((region) => (
          <option key={region.id} value={region.id}>
            {region.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-700"
      >
        Buscar
      </button>
    </form>
  );
}
