import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { formatPrice, idFromListingParam } from "@/lib/utils";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Aviso en oktienda.cl";

/**
 * Vista previa del enlace: lo que se ve al pegar un aviso en WhatsApp.
 *
 * Se compone con la foto, el precio y la comuna en vez de mandar la foto pelada,
 * porque en el chat la tarjeta compite con todo lo demás y el precio es lo que
 * hace que alguien la abra.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { id: idFromListingParam(params.slug) },
    select: {
      title: true,
      price: true,
      currency: true,
      priceType: true,
      commune: { select: { name: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      auction: { select: { status: true } },
    },
  });

  if (!listing) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#059669", color: "white", fontSize: 64, fontWeight: 700 }}>
          oktienda.cl
        </div>
      ),
      size,
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const foto = listing.images[0]?.url;
  const fotoAbsoluta = foto?.startsWith("http") ? foto : foto ? `${site}${foto}` : null;
  const enSubasta = listing.auction?.status === "ACTIVE";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f6f7f9" }}>
        {fotoAbsoluta ? (
          <img src={fotoAbsoluta} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", width: 630, height: 630, background: "#d1fae5" }} />
        )}

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 56, width: 570 }}>
          {enSubasta && (
            <div style={{ display: "flex", background: "#f59e0b", color: "white", fontSize: 24, fontWeight: 700, padding: "6px 16px", borderRadius: 999, marginBottom: 24, alignSelf: "flex-start" }}>
              SUBASTA
            </div>
          )}

          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#047857", marginBottom: 16 }}>
            {formatPrice(listing.price, listing.currency, listing.priceType)}
          </div>

          <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
            {listing.title.slice(0, 70)}
          </div>

          <div style={{ display: "flex", fontSize: 26, color: "#64748b", marginTop: 20 }}>
            {listing.commune?.name ?? "Chile"}
          </div>

          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#059669", marginTop: "auto" }}>
            oktienda.cl
          </div>
        </div>
      </div>
    ),
    size,
  );
}
