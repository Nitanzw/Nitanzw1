"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseAttributes } from "@/lib/verticals";
import { listingHref, slugify } from "@/lib/utils";
import { deleteImage } from "@/lib/storage";
import { features } from "@/lib/features";
import { checkRateLimit } from "@/lib/rate-limit";
import { defaultIncrement, listingSchema, validateSaleTerms } from "@/lib/listing-schema";

export type ListingFormState = { error?: string } | undefined;

const DAYS_ACTIVE = 60;



/// El formulario envía las imágenes ya subidas como JSON: [{url, thumbnailUrl}].
function parseImages(raw: string | undefined): { url: string; thumbnailUrl: string | null }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { url: string; thumbnailUrl?: string } =>
        typeof item === "object" && item !== null && typeof (item as { url?: unknown }).url === "string")
      .slice(0, 10)
      .map((item) => ({ url: item.url, thumbnailUrl: item.thumbnailUrl ?? null }));
  } catch {
    return [];
  }
}

function formToObject(formData: FormData): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    object[key] = value;
  }
  return object;
}

export async function createListingAction(
  _state: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?next=/publicar");

  // Una cuenta recién creada no debería poder empapelar el sitio: el tope es
  // más estrecho durante las primeras 24 horas, que es cuando publica el spam.
  const esCuentaNueva = Date.now() - user.createdAt.getTime() < 24 * 60 * 60 * 1000;
  const tope = esCuentaNueva ? 5 : 25;
  const limite = checkRateLimit(`publicar:${user.id}`, tope, 24 * 60 * 60);
  if (!limite.allowed) {
    return {
      error: esCuentaNueva
        ? "Las cuentas nuevas pueden publicar hasta 5 avisos el primer día. Mañana podrás publicar más."
        : "Llegaste al máximo de avisos por día. Inténtalo mañana.",
    };
  }

  const raw = formToObject(formData);
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del aviso" };
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return { error: "La categoría seleccionada no existe" };

  let attributes: Record<string, string | number | boolean>;
  try {
    attributes = parseAttributes(category.vertical, raw);
  } catch {
    return { error: "Faltan datos obligatorios de la categoría elegida" };
  }

  const { isAuction, error } = validateSaleTerms(parsed.data, { auctionsEnabled: features.auctions });
  if (error) return { error };

  const priceNeeded =
    !isAuction && (parsed.data.priceType === "FIXED" || parsed.data.priceType === "NEGOTIABLE");

  const images = parseImages(parsed.data.images);

  const now = new Date();
  const auctionEnd = new Date(now.getTime() + (parsed.data.durationDays ?? 7) * 24 * 60 * 60 * 1000);
  const listing = await prisma.listing.create({
    data: {
      slug: slugify(parsed.data.title),
      title: parsed.data.title,
      description: parsed.data.description,
      price: isAuction ? parsed.data.startPrice ?? null : priceNeeded ? parsed.data.price ?? null : null,
      priceType: isAuction ? "FIXED" : parsed.data.priceType,
      currency: parsed.data.currency,
      condition: parsed.data.condition ?? null,
      status: "ACTIVE",
      publishedAt: now,
      expiresAt: new Date(now.getTime() + DAYS_ACTIVE * 24 * 60 * 60 * 1000),
      attributes,
      categoryId: category.id,
      communeId: parsed.data.communeId ?? null,
      userId: user.id,
      contactPhone: parsed.data.contactPhone ?? user.phone,
      contactWhatsapp: Boolean(parsed.data.contactWhatsapp),
      allowMessages: parsed.data.allowMessages === undefined ? true : Boolean(parsed.data.allowMessages),
      images: { create: images.map((image, position) => ({ ...image, position })) },
      ...(isAuction && {
        auction: {
          create: {
            startPrice: parsed.data.startPrice!,
            minIncrement: parsed.data.minIncrement ?? defaultIncrement(parsed.data.startPrice!),
            reservePrice: parsed.data.reservePrice ?? null,
            endsAt: auctionEnd,
            originalEndsAt: auctionEnd,
          },
        },
      }),
    },
  });

  revalidatePath("/");
  revalidatePath("/mi-cuenta");
  redirect(listingHref(listing));
}

/**
 * Editar un aviso ya publicado.
 *
 * Se puede corregir el texto, las fotos, la categoría, la ubicación y el
 * contacto. Lo que **no** se puede tocar es la subasta: cambiar el precio
 * inicial o la reserva con ofertas encima sería mover la meta a mitad del
 * remate. Para eso hay que cerrar y volver a publicar.
 */
export async function updateListingAction(
  _state: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const listingId = String(formData.get("listingId") ?? "");
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, auction: { select: { id: true } } },
  });
  if (!existing || existing.userId !== user.id) {
    return { error: "No puedes editar este aviso" };
  }

  const raw = formToObject(formData);
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del aviso" };
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return { error: "La categoría seleccionada no existe" };

  let attributes: Record<string, string | number | boolean>;
  try {
    attributes = parseAttributes(category.vertical, raw);
  } catch {
    return { error: "Faltan datos obligatorios de la categoría elegida" };
  }

  // En una subasta el precio lo manda el remate, no el formulario.
  const isAuction = Boolean(existing.auction);
  const priceNeeded =
    !isAuction && (parsed.data.priceType === "FIXED" || parsed.data.priceType === "NEGOTIABLE");
  if (priceNeeded && parsed.data.price === undefined) {
    return { error: "Ingresa un precio o elige 'Consultar precio'" };
  }

  const images = parseImages(parsed.data.images);

  const previous = await prisma.listingImage.findMany({
    where: { listingId },
    select: { url: true, thumbnailUrl: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: {
        slug: slugify(parsed.data.title),
        title: parsed.data.title,
        description: parsed.data.description,
        ...(isAuction
          ? {}
          : {
              price: priceNeeded ? parsed.data.price ?? null : null,
              priceType: parsed.data.priceType,
              currency: parsed.data.currency,
            }),
        condition: parsed.data.condition ?? null,
        attributes,
        categoryId: category.id,
        communeId: parsed.data.communeId ?? null,
        contactPhone: parsed.data.contactPhone ?? null,
        contactWhatsapp: Boolean(parsed.data.contactWhatsapp),
        allowMessages: parsed.data.allowMessages === undefined ? true : Boolean(parsed.data.allowMessages),
      },
    });

    // Las imágenes se reemplazan por completo: el formulario manda la lista final.
    await tx.listingImage.deleteMany({ where: { listingId } });
    await tx.listingImage.createMany({
      data: images.map((image, position) => ({ ...image, listingId, position })),
    });
  });

  // Los archivos que ya no están en el aviso se borran del almacenamiento.
  const conservadas = new Set(images.flatMap((image) => [image.url, image.thumbnailUrl]));
  await Promise.all(
    previous
      .flatMap((image) => [image.url, image.thumbnailUrl])
      .filter((url): url is string => Boolean(url) && !conservadas.has(url))
      .map(deleteImage),
  );

  const updated = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: { id: true, slug: true },
  });

  revalidatePath("/mi-cuenta");
  revalidatePath(listingHref(updated));
  redirect(listingHref(updated));
}

/// Pausar, reactivar, marcar vendido o eliminar un aviso propio.
export async function updateListingStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");

  const listing = await prisma.listing.findUnique({ where: { id }, select: { userId: true } });
  if (!listing || listing.userId !== user.id) return;

  if (action === "delete") {
    const images = await prisma.listingImage.findMany({
      where: { listingId: id },
      select: { url: true, thumbnailUrl: true },
    });
    await prisma.listing.delete({ where: { id } });
    // Las filas se borran en cascada; los archivos hay que limpiarlos aparte.
    await Promise.all(
      images.flatMap((image) =>
        [image.url, image.thumbnailUrl].filter((url): url is string => Boolean(url)).map(deleteImage),
      ),
    );
  } else {
    const status: Record<string, ListingStatus> = {
      pause: "PAUSED",
      activate: "ACTIVE",
      sold: "SOLD",
      // Renovar es reactivar y correr la fecha de vencimiento otros 60 días.
      renew: "ACTIVE",
    };
    const next = status[action];
    if (!next) return;
    await prisma.listing.update({
      where: { id },
      data: {
        status: next,
        ...(next === "ACTIVE" && { publishedAt: new Date() }),
        ...(action === "renew" && {
          expiresAt: new Date(Date.now() + DAYS_ACTIVE * 24 * 60 * 60 * 1000),
        }),
      },
    });
  }

  revalidatePath("/mi-cuenta");
  revalidatePath("/");
}

export async function incrementViews(listingId: string): Promise<void> {
  await prisma.listing.update({ where: { id: listingId }, data: { views: { increment: 1 } } }).catch(() => {});
}
