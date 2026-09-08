import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Acredita un pago y extiende la vigencia del destacado.
 *
 * Es idempotente: si el pago ya estaba acreditado no vuelve a sumar días, así
 * que da lo mismo que llegue primero el webhook o el retorno del usuario, o que
 * el proveedor reintente la notificación.
 */
export async function confirmPayment(
  paymentId: string,
  options: { providerRef?: string | null } = {},
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return { ok: false };
    if (payment.status === "PAID") return { ok: true, alreadyPaid: true };

    const listing = await tx.listing.findUnique({
      where: { id: payment.listingId },
      select: { featuredUntil: true },
    });
    if (!listing) return { ok: false };

    const now = new Date();
    // Si el aviso ya estaba destacado, los días nuevos se suman al final.
    const from = listing.featuredUntil && listing.featuredUntil > now ? listing.featuredUntil : now;
    const featuredUntil = new Date(from.getTime() + payment.days * 24 * 60 * 60 * 1000);

    await tx.listing.update({ where: { id: payment.listingId }, data: { featuredUntil } });
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: now,
        ...(options.providerRef ? { providerRef: options.providerRef } : {}),
      },
    });

    return { ok: true };
  });
}

export async function failPayment(paymentId: string): Promise<void> {
  await prisma.payment
    .updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED" } })
    .catch(() => {});
}
