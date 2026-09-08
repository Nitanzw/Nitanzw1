import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSavedSearchAlertEmail } from "@/lib/emails";
import { resolveListingQuery, paramsFromQueryString } from "@/lib/listing-query";
import { formatPrice } from "@/lib/utils";

/**
 * Avisa por correo cuando aparecen avisos nuevos que calzan con una búsqueda
 * guardada.
 *
 * Cada búsqueda se resuelve con el mismo traductor que usa /buscar, así que la
 * alerta y la página muestran exactamente lo mismo. `lastNotifiedAt` marca hasta
 * dónde ya se avisó: si el correo no sale, no se mueve y el aviso entra en la
 * próxima corrida.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://oktienda.cl/api/cron/alertas
 */

const MAX_LISTINGS_PER_EMAIL = 10;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searches = await prisma.savedSearch.findMany({
    where: { alerts: true },
    include: { user: { select: { name: true, email: true } } },
  });

  const startedAt = new Date();
  let emailsSent = 0;
  let listingsNotified = 0;

  for (const search of searches) {
    // Solo avisos publicados después del último envío (o de guardar la búsqueda).
    const since = search.lastNotifiedAt ?? search.createdAt;
    const { where } = await resolveListingQuery(paramsFromQueryString(search.query));

    const listings = await prisma.listing.findMany({
      where: { AND: [where, { publishedAt: { gt: since } }] },
      orderBy: { publishedAt: "desc" },
      take: MAX_LISTINGS_PER_EMAIL,
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
        priceType: true,
        commune: { select: { name: true } },
      },
    });

    if (listings.length === 0) continue;

    const sent = await sendSavedSearchAlertEmail(
      search.user,
      { id: search.id, name: search.name, query: search.query },
      listings.map((listing) => ({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        priceLabel: formatPrice(listing.price, listing.currency, listing.priceType),
        communeName: listing.commune?.name ?? null,
      })),
    );

    if (!sent) continue;

    await prisma.savedSearch.update({
      where: { id: search.id },
      data: { lastNotifiedAt: startedAt },
    });

    emailsSent += 1;
    listingsNotified += listings.length;
  }

  return NextResponse.json({
    ranAt: startedAt.toISOString(),
    searchesChecked: searches.length,
    emailsSent,
    listingsNotified,
  });
}
