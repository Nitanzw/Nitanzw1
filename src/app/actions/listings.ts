"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseAttributes } from "@/lib/verticals";
import { listingHref, slugify } from "@/lib/utils";

export type ListingFormState = { error?: string } | undefined;

const DAYS_ACTIVE = 60;

const listingSchema = z.object({
  title: z.string().trim().min(8, "El título debe tener al menos 8 caracteres").max(120),
  description: z.string().trim().min(20, "Describe tu aviso con al menos 20 caracteres").max(5000),
  categoryId: z.string().min(1, "Elige una categoría"),
  communeId: z.string().optional().or(z.literal("").transform(() => undefined)),
  priceType: z.enum(["FIXED", "NEGOTIABLE", "FREE", "ON_REQUEST"]),
  currency: z.enum(["CLP", "UF", "USD"]),
  price: z.coerce.number().int().nonnegative().optional(),
  condition: z.enum(["NEW", "USED"]).optional().or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().trim().max(20).optional().or(z.literal("").transform(() => undefined)),
  contactWhatsapp: z.coerce.boolean().optional(),
  allowMessages: z.coerce.boolean().optional(),
  images: z.string().optional(),
});

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

  const priceNeeded = parsed.data.priceType === "FIXED" || parsed.data.priceType === "NEGOTIABLE";
  if (priceNeeded && (parsed.data.price === undefined || Number.isNaN(parsed.data.price))) {
    return { error: "Ingresa un precio o elige 'Consultar precio'" };
  }

  const imageUrls = (parsed.data.images ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("/uploads/"))
    .slice(0, 10);

  const now = new Date();
  const listing = await prisma.listing.create({
    data: {
      slug: slugify(parsed.data.title),
      title: parsed.data.title,
      description: parsed.data.description,
      price: priceNeeded ? parsed.data.price ?? null : null,
      currency: parsed.data.currency,
      priceType: parsed.data.priceType,
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
      images: { create: imageUrls.map((url, position) => ({ url, position })) },
    },
  });

  revalidatePath("/");
  revalidatePath("/mi-cuenta");
  redirect(listingHref(listing));
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
    await prisma.listing.delete({ where: { id } });
  } else {
    const status: Record<string, ListingStatus> = {
      pause: "PAUSED",
      activate: "ACTIVE",
      sold: "SOLD",
    };
    const next = status[action];
    if (!next) return;
    await prisma.listing.update({
      where: { id },
      data: { status: next, ...(next === "ACTIVE" && { publishedAt: new Date() }) },
    });
  }

  revalidatePath("/mi-cuenta");
  revalidatePath("/");
}

export async function incrementViews(listingId: string): Promise<void> {
  await prisma.listing.update({ where: { id: listingId }, data: { views: { increment: 1 } } }).catch(() => {});
}
