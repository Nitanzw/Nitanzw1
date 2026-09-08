/**
 * Límite de intentos por ventana de tiempo, en memoria del proceso.
 *
 * Frena fuerza bruta de contraseñas y envío masivo de correos o mensajes.
 * Al vivir en memoria, cada instancia lleva su propia cuenta: con varias
 * instancias hay que moverlo a Redis (`checkRateLimit` es el único punto a
 * reemplazar; la firma no cambia).
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  /// Segundos que faltan para poder reintentar.
  retryAfter: number;
};

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

/// Borra el contador de una clave (por ejemplo, tras un login exitoso).
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Limpieza periódica para que el mapa no crezca sin control.
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  timer.unref?.();
}
