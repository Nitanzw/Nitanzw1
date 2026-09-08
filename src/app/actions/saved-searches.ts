"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type SavedSearchState = { error?: string; ok?: boolean } | undefined;

const MAX_PER_USER = 30;

/// Guarda la búsqueda actual (los query params tal como están) para repetirla
/// después. La base para alertas por correo: falta solo el job que las corra.
export async function saveSearchAction(
  _state: SavedSearchState,
  formData: FormData,
): Promise<SavedSearchState> {
  const user = await getCurrentUser();
  const query = String(formData.get("query") ?? "").replace(/^\?/, "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);

  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/buscar?${query}`)}`);
  if (!name) return { error: "Ponle un nombre a la búsqueda" };

  const count = await prisma.savedSearch.count({ where: { userId: user.id } });
  if (count >= MAX_PER_USER) return { error: `Puedes guardar hasta ${MAX_PER_USER} búsquedas` };

  await prisma.savedSearch.create({ data: { userId: user.id, name, query } });

  revalidatePath("/mi-cuenta/busquedas");
  return { ok: true };
}

export async function deleteSavedSearchAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const id = String(formData.get("id") ?? "");
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/mi-cuenta/busquedas");
}

/// Activa o desactiva el aviso por correo de una búsqueda guardada.
export async function toggleSearchAlertsAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const id = String(formData.get("id") ?? "");
  const search = await prisma.savedSearch.findFirst({
    where: { id, userId: user.id },
    select: { alerts: true },
  });
  if (!search) return;

  await prisma.savedSearch.updateMany({
    where: { id, userId: user.id },
    data: { alerts: !search.alerts },
  });

  revalidatePath("/mi-cuenta/busquedas");
}
