"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type PushState = { error?: string; ok?: boolean } | undefined;

/// Guarda la autorización que dio el navegador para mandar notificaciones.
export async function subscribeToPushAction(_state: PushState, formData: FormData): Promise<PushState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  try {
    const subscription = JSON.parse(String(formData.get("subscription") ?? "")) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
      return { error: "El navegador entregó una suscripción incompleta" };
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { userId: user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: String(formData.get("userAgent") ?? "").slice(0, 200) || null,
      },
    });

    return { ok: true };
  } catch {
    return { error: "No pudimos activar las notificaciones" };
  }
}

/// El usuario apaga las notificaciones en este dispositivo.
export async function unsubscribeFromPushAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const endpoint = String(formData.get("endpoint") ?? "");
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  }
}
