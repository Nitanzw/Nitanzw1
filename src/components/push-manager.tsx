"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/actions/push";

/**
 * Registra el service worker y gestiona el permiso de notificaciones.
 *
 * El permiso se pide solo cuando la persona toca el botón: un sitio que lo pide
 * apenas entras se gana un "bloquear para siempre", y ahí ya no hay vuelta atrás.
 */
export function PushManager({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [estado, setEstado] = useState<"cargando" | "no-soportado" | "activo" | "inactivo" | "bloqueado">("cargando");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    async function preparar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) {
        setEstado("no-soportado");
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!registro) {
        setEstado("no-soportado");
        return;
      }

      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }

      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? "activo" : "inactivo");
    }

    preparar();
  }, [vapidPublicKey]);

  async function activar() {
    if (!vapidPublicKey) return;
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ABytes(vapidPublicKey),
      });

      const datos = new FormData();
      datos.append("subscription", JSON.stringify(suscripcion));
      datos.append("userAgent", navigator.userAgent);
      const resultado = await subscribeToPushAction(undefined, datos);

      setEstado(resultado?.ok ? "activo" : "inactivo");
    } catch {
      setEstado("inactivo");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      if (suscripcion) {
        const datos = new FormData();
        datos.append("endpoint", suscripcion.endpoint);
        await unsubscribeFromPushAction(datos);
        await suscripcion.unsubscribe();
      }
      setEstado("inactivo");
    } finally {
      setTrabajando(false);
    }
  }

  if (estado === "cargando") return null;

  if (estado === "no-soportado") {
    return (
      <p className="text-sm text-ink-500">
        Este navegador no admite notificaciones. En iPhone, primero agrega oktienda.cl a la
        pantalla de inicio y ábrela desde ahí.
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <p className="text-sm text-ink-500">
        Bloqueaste las notificaciones para oktienda.cl. Para recibirlas, habilítalas en los
        permisos del sitio en tu navegador.
      </p>
    );
  }

  const activo = estado === "activo";

  return (
    <button
      type="button"
      onClick={activo ? desactivar : activar}
      disabled={trabajando}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
        activo
          ? "border border-slate-200 bg-white text-ink-700 hover:bg-slate-50"
          : "bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {trabajando ? (
        <Loader2 className="size-4 animate-spin" />
      ) : activo ? (
        <BellOff className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
      {activo ? "Desactivar notificaciones en este dispositivo" : "Activar notificaciones"}
    </button>
  );
}

/// La clave VAPID viaja en base64url y el navegador la pide como bytes.
function base64ABytes(base64url: string): ArrayBuffer {
  const relleno = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}
