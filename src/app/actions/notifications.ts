"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

/// Marca todo como leído desde la lista de notificaciones.
export async function markAllReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  await markAllRead(user.id);
  revalidatePath("/mi-cuenta/notificaciones");
  revalidatePath("/mi-cuenta");
}

/// Abre una notificación: la marca leída y lleva a donde apunta.
export async function openNotificationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const id = String(formData.get("id") ?? "");
  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: { url: true },
  });
  if (!notification) redirect("/mi-cuenta/notificaciones");

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/mi-cuenta/notificaciones");
  redirect(notification.url);
}
