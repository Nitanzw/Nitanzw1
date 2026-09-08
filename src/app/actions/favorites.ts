"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const listingId = String(formData.get("listingId") ?? "");
  const from = String(formData.get("from") ?? "/");

  if (!user) redirect(`/ingresar?next=${encodeURIComponent(from)}`);
  if (!listingId) return;

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { userId_listingId: { userId: user.id, listingId } } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, listingId } });
  }

  revalidatePath(from);
  revalidatePath("/mi-cuenta/favoritos");
}
