import { PrismaClient } from "@prisma/client";

/**
 * Acceso a la base desde las pruebas.
 *
 * Sirve para preparar situaciones que en la vida real toman días —una subasta a
 * punto de cerrar, un aviso vencido— sin agregar endpoints de prueba al sitio:
 * cualquier ruta que exista "solo para los tests" termina existiendo también
 * para quien la encuentre en producción.
 */
export const db = new PrismaClient({ log: [] });

/// Deja una subasta vencida para que el cron la cierre en la próxima corrida.
export async function adelantarCierre(listingId: string): Promise<void> {
  await db.auction.updateMany({
    where: { listingId },
    data: { endsAt: new Date(Date.now() - 60_000) },
  });
}

/// Deja el cierre dentro de la ventana anti-francotirador.
export async function cierreEnMinutos(listingId: string, minutos: number): Promise<void> {
  await db.auction.updateMany({
    where: { listingId },
    data: { endsAt: new Date(Date.now() + minutos * 60_000) },
  });
}

export async function vencerAviso(listingId: string): Promise<void> {
  await db.listing.update({
    where: { id: listingId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}

export async function hacerAdministrador(email: string): Promise<void> {
  await db.user.update({ where: { email }, data: { role: "ADMIN" } });
}
