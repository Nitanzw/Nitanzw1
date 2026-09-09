import type { Metadata } from "next";
import { AlarmClock, Gavel, MessageCircle, ShieldAlert, Star, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { recentNotifications } from "@/lib/notifications";
import { formatRelativeDate } from "@/lib/utils";
import { markAllReadAction, openNotificationAction } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificaciones" };

const ICONS = {
  MESSAGE: MessageCircle,
  OUTBID: Gavel,
  AUCTION_WON: Trophy,
  AUCTION_CLOSED: Gavel,
  AUCTION_CLOSING: AlarmClock,
  REVIEW: Star,
  MODERATION: ShieldAlert,
} as const;

const TONES = {
  MESSAGE: "bg-brand-50 text-brand-700",
  OUTBID: "bg-amber-100 text-amber-800",
  AUCTION_WON: "bg-brand-100 text-brand-800",
  AUCTION_CLOSED: "bg-slate-100 text-ink-700",
  AUCTION_CLOSING: "bg-red-100 text-red-700",
  REVIEW: "bg-amber-50 text-amber-700",
  MODERATION: "bg-red-100 text-red-700",
} as const;

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await recentNotifications(user.id);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">No tienes notificaciones</p>
        <p className="mt-1 text-sm text-ink-500">
          Acá aparecerán los mensajes, las ofertas de tus subastas y las calificaciones que recibas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <form action={markAllReadAction} className="flex justify-end">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink-700 hover:bg-slate-50">
            Marcar todas como leídas
          </button>
        </form>
      )}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type];
          return (
            <form key={notification.id} action={openNotificationAction}>
              <input type="hidden" name="id" value={notification.id} />
              <button
                type="submit"
                className={`flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50 ${
                  notification.readAt ? "" : "bg-brand-50/40"
                }`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[notification.type]}`}>
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-900">{notification.title}</span>
                  {notification.body && (
                    <span className="mt-0.5 block text-sm text-ink-500">{notification.body}</span>
                  )}
                  <span className="mt-1 block text-xs text-ink-500">
                    {formatRelativeDate(notification.createdAt)}
                  </span>
                </span>

                {!notification.readAt && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />
                )}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
