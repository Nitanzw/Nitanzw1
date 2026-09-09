/* Service worker de oktienda.cl
 *
 * Hace dos cosas: mostrar una página decente cuando el teléfono se queda sin
 * señal, y recibir las notificaciones push aunque la aplicación esté cerrada.
 *
 * No cachea avisos ni precios a propósito: en un marketplace mostrar un precio
 * viejo o una subasta ya cerrada es peor que mostrar un error de conexión.
 */

const CACHE = "oktienda-v1";
const SIN_CONEXION = "/sin-conexion";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SIN_CONEXION, "/icono-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const peticion = event.request;
  // Solo navegación: el resto va directo a la red.
  if (peticion.mode !== "navigate") return;

  event.respondWith(
    fetch(peticion).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(SIN_CONEXION)) ?? new Response("Sin conexión", { status: 503 });
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let datos;
  try {
    datos = event.data.json();
  } catch {
    datos = { title: "oktienda.cl", body: event.data.text(), url: "/" };
  }

  event.waitUntil(
    self.registration.showNotification(datos.title ?? "oktienda.cl", {
      body: datos.body ?? "",
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      data: { url: datos.url ?? "/" },
      // Las de subasta vibran: si te superaron la oferta, quieres enterarte ahora.
      vibrate: datos.urgente ? [200, 100, 200] : undefined,
      tag: datos.tag,
      renotify: Boolean(datos.tag),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      // Si la aplicación ya está abierta, se navega ahí en vez de abrir otra.
      for (const ventana of ventanas) {
        if ("focus" in ventana) {
          ventana.navigate?.(destino);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
