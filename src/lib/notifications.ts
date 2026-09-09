import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

/**
 * Avisos dentro del sitio.
 *
 * Todo lo que se le notifica a alguien pasa por acá —campanita y push a la vez—
 * para que agregar un motivo nuevo sea agregar una llamada y no inventar otra
 * forma de avisar. Nunca lanza: que falle una notificación no puede tumbar la
 * acción que la originó; una oferta se registra igual aunque el aviso no salga.
 */

/// Los avisos de subasta hacen vibrar el teléfono: son los que no pueden esperar.
const URGENTES: NotificationType[] = ["OUTBID", "AUCTION_CLOSING", "AUCTION_WON"];

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  url: string;
};

export async function notify(
  notification: NewNotification,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  try {
    await client.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body ?? null,
        url: notification.url,
      },
    });
  } catch (error) {
    console.error("No se pudo guardar la notificación", error);
  }

  // El push va aparte y con su propia red: si falla, la campanita ya quedó
  // guardada y la acción que originó el aviso no se entera.
  try {
    await sendPush(notification.userId, {
      title: notification.title,
      body: notification.body,
      url: notification.url,
      tag: notification.type,
      urgente: URGENTES.includes(notification.type),
    });
  } catch (error) {
    console.error("No se pudo enviar el push", error);
  }
}

/// Varias personas, mismo aviso (por ejemplo, todos los que ofertaron).
export async function notifyMany(notifications: NewNotification[]): Promise<void> {
  if (notifications.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        url: n.url,
      })),
    });
  } catch (error) {
    console.error("No se pudieron guardar las notificaciones", error);
  }

  await Promise.all(
    notifications.map((n) =>
      sendPush(n.userId, {
        title: n.title,
        body: n.body,
        url: n.url,
        tag: n.type,
        urgente: URGENTES.includes(n.type),
      }).catch((error) => console.error("No se pudo enviar el push", error)),
    ),
  );
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function recentNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
