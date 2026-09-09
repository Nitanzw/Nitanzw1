import "server-only";

/**
 * Reporte de errores del servidor.
 *
 * Sin esto, un error queda en el log del contenedor y nadie se entera hasta que
 * un usuario reclama. Acá se registra siempre en formato estructurado (fácil de
 * filtrar en cualquier visor de logs) y, si hay `ERROR_WEBHOOK_URL` configurado,
 * se manda además a donde quieras: un canal de Slack, Discord, o un recolector
 * propio.
 *
 * Para usar Sentry en su lugar, este es el único punto que hay que cambiar.
 */

export type ErrorContext = {
  /// Dónde ocurrió: "aviso/[slug]", "cron/subastas", "accion/publicar"…
  where: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
};

let ultimoAviso = 0;

export async function reportError(error: unknown, context: ErrorContext): Promise<void> {
  const detalle = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };

  console.error(
    JSON.stringify({
      nivel: "error",
      momento: new Date().toISOString(),
      donde: context.where,
      usuario: context.userId ?? null,
      ...detalle,
      ...(context.extra ? { extra: context.extra } : {}),
    }),
  );

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;

  // Un fallo repetido no debe convertirse en una lluvia de mensajes: como mucho
  // uno cada 30 segundos.
  const ahora = Date.now();
  if (ahora - ultimoAviso < 30_000) return;
  ultimoAviso = ahora;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ oktienda.cl — error en ${context.where}: ${detalle.message}`,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Si el aviso falla, el error ya quedó en el log: no vale la pena insistir.
  }
}
