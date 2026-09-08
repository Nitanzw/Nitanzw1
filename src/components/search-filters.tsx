"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Category, Vertical } from "@prisma/client";
import { filterableFieldsFor } from "@/lib/verticals";
import type { SearchParams } from "@/lib/search";

type CategoryWithChildren = Category & { children: Category[] };

function value(params: SearchParams, key: string): string {
  const raw = params[key];
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
}

/**
 * Filtros de búsqueda. Los campos propios del vertical se generan desde
 * src/lib/verticals.ts, así que sumar un vertical no requiere tocar este archivo.
 */
export function SearchFilters({
  params,
  category,
  rootCategories,
  regions,
  communes,
}: {
  params: SearchParams;
  category: CategoryWithChildren | null;
  rootCategories: { slug: string; name: string }[];
  regions: { id: string; name: string }[];
  communes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const vertical: Vertical | undefined = category?.vertical;
  const verticalFields = vertical ? filterableFieldsFor(vertical) : [];

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const next = new URLSearchParams();
    for (const [key, raw] of data.entries()) {
      const item = String(raw).trim();
      if (item) next.set(key, item);
    }
    router.push(`/buscar?${next.toString()}`);
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
      onChange={(event) => submit(event.currentTarget)}
    >
      <input type="hidden" name="q" value={value(params, "q")} />
      <input type="hidden" name="orden" value={value(params, "orden")} />

      <div>
        <h2 className="text-sm font-bold text-ink-900">Categoría</h2>
        <div className="mt-2 space-y-1 text-sm">
          {category ? (
            <>
              <Link href="/buscar" className="block text-ink-500 hover:text-brand-700">
                ← Todas las categorías
              </Link>
              <p className="pt-1 font-semibold text-ink-900">{category.name}</p>
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/buscar?categoria=${child.slug}`}
                  className="block pl-3 text-ink-700 hover:text-brand-700"
                >
                  {child.name}
                </Link>
              ))}
            </>
          ) : (
            rootCategories.map((root) => (
              <Link
                key={root.slug}
                href={`/buscar?categoria=${root.slug}`}
                className="block text-ink-700 hover:text-brand-700"
              >
                {root.name}
              </Link>
            ))
          )}
        </div>
        {category && <input type="hidden" name="categoria" value={category.slug} />}
      </div>

      <div>
        <h2 className="text-sm font-bold text-ink-900">Ubicación</h2>
        <select
          name="region"
          defaultValue={value(params, "region")}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todo Chile</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
        {communes.length > 0 && (
          <select
            name="comuna"
            defaultValue={value(params, "comuna")}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todas las comunas</option>
            {communes.map((commune) => (
              <option key={commune.id} value={commune.id}>
                {commune.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-ink-900">Precio</h2>
        <div className="mt-2 flex items-center gap-2">
          <input
            name="min"
            inputMode="numeric"
            placeholder="Desde"
            defaultValue={value(params, "min")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="max"
            inputMode="numeric"
            placeholder="Hasta"
            defaultValue={value(params, "max")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-ink-900">Estado</h2>
        <select
          name="estado"
          defaultValue={value(params, "estado")}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Nuevos y usados</option>
          <option value="nuevo">Nuevo</option>
          <option value="usado">Usado</option>
        </select>
      </div>

      {verticalFields.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-bold text-ink-900">Filtros de {category?.name}</h2>
          {verticalFields.map((field) => {
            if (field.type === "number") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-medium text-ink-500">
                    {field.label} {field.unit ? `(${field.unit})` : ""}
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      name={`${field.key}_min`}
                      inputMode="numeric"
                      placeholder="Desde"
                      defaultValue={value(params, `${field.key}_min`)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      name={`${field.key}_max`}
                      inputMode="numeric"
                      placeholder="Hasta"
                      defaultValue={value(params, `${field.key}_max`)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              );
            }

            if (field.type === "boolean") {
              return (
                <label key={field.key} className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    name={field.key}
                    value="1"
                    defaultChecked={value(params, field.key) === "1"}
                    className="size-4 rounded border-slate-300 accent-emerald-600"
                  />
                  {field.label}
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <div key={field.key}>
                  <label className="text-xs font-medium text-ink-500">{field.label}</label>
                  <select
                    name={field.key}
                    defaultValue={value(params, field.key)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={field.key}>
                <label className="text-xs font-medium text-ink-500">{field.label}</label>
                <input
                  name={field.key}
                  defaultValue={value(params, field.key)}
                  placeholder={field.placeholder}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            );
          })}
        </div>
      )}

      <label className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-ink-700">
        <input
          type="checkbox"
          name="confoto"
          value="1"
          defaultChecked={value(params, "confoto") === "1"}
          className="size-4 rounded border-slate-300 accent-emerald-600"
        />
        Solo con fotos
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Aplicar
        </button>
        <Link
          href={category ? `/buscar?categoria=${category.slug}` : "/buscar"}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-ink-700 hover:bg-slate-50"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}
