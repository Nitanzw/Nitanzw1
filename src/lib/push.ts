import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Notificaciones push.
 *
 * Complementan a la campanita: la campanita sirve si la persona está en el
 * sitio, el push sirve cuando no lo está —que es justo el caso de una subasta
 * que cierra mientras nadie mira—.
 *
 * Requiere un par de claves VAPID, que identifican al servidor ante el
 * proveedor push del navegador. Se generan una sola vez:
 *
 *   npx web-push generate-vapid-keys
 *
 * y se guardan en VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY. Sin ellas, el push
 * queda apagado y el resto del sitio funciona igual.
 */

export function pushEnabled(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configurar(): boolean {
  if (!pushEnabled()) return false;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:contacto@oktienda.cl",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    return true;
  } catch (error) {
    // Claves mal copiadas: se avisa una vez y el sitio sigue sin push.
    console.error("Claves VAPID inválidas: el push queda apagado", error);
    return false;
  }
}

export type PushPayload = {
  title: string;
  body?: string | null;
  url: string;
  /// Agrupa notificaciones del mismo tema: la nueva reemplaza a la anterior.
  tag?: string;
  /// Vibra al llegar. Para lo que no puede esperar, como una subasta cerrando.
  urgente?: boolean;
};

/// Envía a todos los dispositivos de una persona. Nunca lanza: un push que
/// falla no puede tumbar la acción que lo originó.
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!configurar()) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return 0;

  const cuerpo = JSON.stringify(payload);
  let enviados = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          cuerpo,
        );
        enviados += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404 o 410: el navegador ya no existe para el proveedor. Se limpia
        // sola en vez de reintentar para siempre.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else {
          console.error("No se pudo enviar el push", status ?? error);
        }
      }
    }),
  );

  return enviados;
}
