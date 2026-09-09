"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import type { Vertical } from "@prisma/client";
import { createListingAction, updateListingAction } from "@/app/actions/listings";
import { fieldsFor } from "@/lib/verticals";
import { AUCTION_DURATIONS } from "@/lib/auctions";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  vertical: Vertical;
  parentId: string | null;
};

type RegionOption = { id: string; name: string; communes: { id: string; name: string }[] };

/// Valores de un aviso que ya existe, para editarlo con el mismo formulario.
export type ListingDefaults = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  priceType: string;
  currency: string;
  condition: string | null;
  categoryId: string;
  parentCategoryId: string | null;
  regionId: string | null;
  communeId: string | null;
  contactPhone: string | null;
  contactWhatsapp: boolean;
  allowMessages: boolean;
  images: { url: string; thumbnailUrl: string }[];
  attributes: Record<string, string | number | boolean>;
  /// Un aviso en subasta no permite tocar precio ni condiciones del remate.
  isAuction: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400";
const labelClass = "block text-sm font-medium text-ink-700";

export function PublishForm({
  categories,
  regions,
  defaultPhone,
  auctionsEnabled,
  listing,
}: {
  categories: CategoryOption[];
  regions: RegionOption[];
  defaultPhone: string;
  auctionsEnabled: boolean;
  /// Presente al editar: el mismo formulario sirve para crear y para corregir.
  listing?: ListingDefaults;
}) {
  const editing = Boolean(listing);
  const [state, action, pending] = useActionState(
    editing ? updateListingAction : createListingAction,
    undefined,
  );

  const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const [parentId, setParentId] = useState(listing?.parentCategoryId ?? "");
  const children = useMemo(
    () => categories.filter((c) => c.parentId === parentId),
    [categories, parentId],
  );

  const [categoryId, setCategoryId] = useState(listing?.categoryId ?? "");
  const selected = categories.find((c) => c.id === categoryId) ?? categories.find((c) => c.id === parentId);
  const verticalFields = selected ? fieldsFor(selected.vertical) : [];

  const [regionId, setRegionId] = useState(listing?.regionId ?? "");
  const communes = regions.find((r) => r.id === regionId)?.communes ?? [];

  const [saleType, setSaleType] = useState<"FIXED" | "AUCTION">("FIXED");
  // Al editar, la subasta ya está definida y no se puede convertir el aviso.
  const isAuction = editing ? Boolean(listing?.isAuction) : auctionsEnabled && saleType === "AUCTION";

  const [priceType, setPriceType] = useState(listing?.priceType ?? "FIXED");
  const priceNeeded = !isAuction && (priceType === "FIXED" || priceType === "NEGOTIABLE");

  const [images, setImages] = useState<{ url: string; thumbnailUrl: string }[]>(listing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: { url: string; thumbnailUrl: string }[] = [];
      for (const file of Array.from(files).slice(0, 10 - images.length)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body });
        const result = (await response.json()) as { url?: string; thumbnailUrl?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? "No se pudo subir la imagen");
        uploaded.push({ url: result.url, thumbnailUrl: result.thumbnailUrl ?? result.url });
      }
      setImages((current) => [...current, ...uploaded].slice(0, 10));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">1. Categoría</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Rubro
            <select
              value={parentId}
              onChange={(event) => {
                setParentId(event.target.value);
                setCategoryId("");
              }}
              className={inputClass}
              required
            >
              <option value="">Elige un rubro</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Subcategoría
            <select
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
              required
              disabled={!parentId}
            >
              <option value="">Elige una subcategoría</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {editing && <input type="hidden" name="listingId" value={listing!.id} />}

      {auctionsEnabled && !editing && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-ink-900">2. ¿Cómo lo vendes?</h2>
          <input type="hidden" name="saleType" value={saleType} />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "FIXED" as const, title: "Precio directo", text: "Publicas un precio y te contactan." },
              { value: "AUCTION" as const, title: "Subasta", text: "Reciben ofertas y gana la más alta al cerrar." },
            ].map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setSaleType(option.value)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  saleType === option.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-ink-900">{option.title}</p>
                <p className="mt-1 text-sm text-ink-500">{option.text}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">
          {auctionsEnabled && !editing ? "3." : "2."} Tu aviso
        </h2>
        <label className={labelClass}>
          Título
          <input
            name="title"
            required
            minLength={8}
            maxLength={120}
            defaultValue={listing?.title}
            placeholder="Ej: Toyota Yaris 2020 único dueño"
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Descripción
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={6}
            defaultValue={listing?.description}
            placeholder="Cuenta el estado, accesorios, motivo de venta y forma de entrega."
            className={inputClass}
          />
        </label>

        {isAuction && editing ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Este aviso está en subasta: el precio lo definen las ofertas. Puedes corregir el
            texto, las fotos y el contacto, pero no las condiciones del remate.
          </p>
        ) : isAuction ? (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              En una subasta la gente oferta y gana la oferta más alta al cerrar. No se cobra
              nada por el sitio: al terminar te ponemos en contacto con el ganador.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Precio inicial
                <input
                  name="startPrice"
                  inputMode="numeric"
                  required
                  placeholder="100000"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Incremento mínimo <span className="font-normal text-ink-500">(opcional)</span>
                <input name="minIncrement" inputMode="numeric" placeholder="5000" className={inputClass} />
              </label>

              <label className={labelClass}>
                Precio de reserva <span className="font-normal text-ink-500">(opcional)</span>
                <input name="reservePrice" inputMode="numeric" placeholder="180000" className={inputClass} />
                <span className="mt-1 block text-xs text-ink-500">
                  Nadie lo ve. Si las ofertas no lo alcanzan, no estás obligado a vender.
                </span>
              </label>

              <label className={labelClass}>
                Duración
                <select name="durationDays" defaultValue={7} className={inputClass}>
                  {AUCTION_DURATIONS.map((option) => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-ink-500">
                  Si alguien oferta en los últimos 5 minutos, el cierre se extiende.
                </span>
              </label>
            </div>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Tipo de precio
            <select
              name="priceType"
              value={priceType}
              onChange={(event) => setPriceType(event.target.value)}
              className={inputClass}
            >
              <option value="FIXED">Precio fijo</option>
              <option value="NEGOTIABLE">Conversable</option>
              <option value="ON_REQUEST">Consultar precio</option>
              <option value="FREE">Gratis</option>
            </select>
          </label>

          <label className={labelClass}>
            Precio
            <input
              name="price"
              inputMode="numeric"
              disabled={!priceNeeded}
              required={priceNeeded}
              defaultValue={listing?.price ?? undefined}
              placeholder="9800000"
              className={`${inputClass} disabled:bg-slate-100`}
            />
          </label>

          <label className={labelClass}>
            Moneda
            <select name="currency" className={inputClass} defaultValue={listing?.currency ?? "CLP"}>
              <option value="CLP">Pesos (CLP)</option>
              <option value="UF">UF</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
        </div>
        )}

        <label className={labelClass}>
          Estado del producto
          <select name="condition" className={inputClass} defaultValue={listing?.condition ?? ""}>
            <option value="">No aplica</option>
            <option value="NEW">Nuevo</option>
            <option value="USED">Usado</option>
          </select>
        </label>
      </section>

      {verticalFields.length > 0 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-ink-900">3. Detalles de {selected?.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {verticalFields.map((field) => (
              <label key={field.key} className={field.type === "boolean" ? "flex items-center gap-2 text-sm text-ink-700" : labelClass}>
                {field.type === "boolean" ? (
                  <>
                    <input
                      type="checkbox"
                      name={field.key}
                      defaultChecked={Boolean(listing?.attributes?.[field.key])}
                      className="size-4 rounded border-slate-300 accent-emerald-600"
                    />
                    {field.label}
                  </>
                ) : (
                  <>
                    {field.label} {field.unit ? <span className="text-ink-500">({field.unit})</span> : null}
                    {field.required && <span className="text-red-500"> *</span>}
                    {field.type === "select" ? (
                      <select
                        name={field.key}
                        required={field.required}
                        className={inputClass}
                        defaultValue={String(listing?.attributes?.[field.key] ?? "")}
                      >
                        <option value="">Selecciona</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={field.key}
                        required={field.required}
                        inputMode={field.type === "number" ? "numeric" : "text"}
                        defaultValue={
                          listing?.attributes?.[field.key] !== undefined
                            ? String(listing.attributes[field.key])
                            : undefined
                        }
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Fotos</h2>
        <p className="text-sm text-ink-500">Hasta 10 imágenes. La primera será la portada.</p>

        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <div key={image.url} className="relative size-24 overflow-hidden rounded-lg border border-slate-200">
              { }
              <img src={image.thumbnailUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((item) => item.url !== image.url))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="Quitar imagen"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          {images.length < 10 && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-ink-500 hover:border-brand-400 hover:text-brand-600">
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              <span className="text-[11px]">Subir</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
          )}
        </div>
        {uploadError && <p className="text-sm text-red-700">{uploadError}</p>}
        <input type="hidden" name="images" value={JSON.stringify(images)} />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Ubicación y contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Región
            <select value={regionId} onChange={(event) => setRegionId(event.target.value)} className={inputClass}>
              <option value="">Elige una región</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Comuna
            <select
              name="communeId"
              className={inputClass}
              disabled={!regionId}
              defaultValue={listing?.communeId ?? ""}
            >
              <option value="">Elige una comuna</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Teléfono de contacto
          <input
            name="contactPhone"
            defaultValue={listing?.contactPhone ?? defaultPhone}
            placeholder="+56 9 1234 5678"
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="contactWhatsapp"
            defaultChecked={listing ? listing.contactWhatsapp : true}
            className="size-4 rounded border-slate-300 accent-emerald-600"
          />
          Aceptar contacto por WhatsApp
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="allowMessages"
            defaultChecked={listing ? listing.allowMessages : true}
            className="size-4 rounded border-slate-300 accent-emerald-600"
          />
          Recibir mensajes por el chat de oktienda
        </label>
      </section>

      <button
        type="submit"
        disabled={pending || uploading}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending
          ? editing
            ? "Guardando…"
            : "Publicando…"
          : editing
            ? "Guardar cambios"
            : "Publicar aviso"}
      </button>
    </form>
  );
}
