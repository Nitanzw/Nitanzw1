import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Marca como vencidos los avisos cuya fecha de expiración ya pasó y apaga los
 * destacados caducados.
 *
 * Pensado para un cron externo (Vercel Cron, GitHub Actions, cron del servidor)
 * llamando una vez al día:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/expirar
 *
 * Si CRON_SECRET no está definido, la ruta solo responde en desarrollo.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  const expired = await prisma.listing.updateMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  // El destacado vencido deja de contar aunque el aviso siga activo.
  const unfeatured = await prisma.listing.updateMany({
    where: { featuredUntil: { lt: now } },
    data: { featuredUntil: null },
  });

  // Tokens vencidos o ya usados: no aportan nada y solo hacen crecer la tabla.
  const tokens = await prisma.token.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
  });

  return NextResponse.json({
    ranAt: now.toISOString(),
    expiredListings: expired.count,
    clearedFeatured: unfeatured.count,
    deletedTokens: tokens.count,
  });
}
