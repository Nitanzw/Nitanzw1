"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { findPlan } from "@/lib/plans";
import { paymentProvider } from "@/lib/payments";

export type CheckoutState = { error?: string } | undefined;

/// Crea el pago pendiente y envía al usuario al proveedor.
export async function startCheckoutAction(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const listingId = String(formData.get("listingId") ?? "");
  const planCode = String(formData.get("planCode") ?? "");

  const plan = findPlan(planCode);
  if (!plan) return { error: "El plan seleccionado no existe" };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, userId: true },
  });
  if (!listing || listing.userId !== user.id) {
    return { error: "Solo puedes destacar tus propios avisos" };
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      listingId: listing.id,
      planCode: plan.code,
      days: plan.days,
      amount: plan.price,
      currency: "CLP",
      provider: paymentProvider().name,
    },
  });

  let redirectUrl: string;
  try {
    const checkout = await paymentProvider().createCheckout({
      paymentId: payment.id,
      plan,
      listingTitle: listing.title,
      payerEmail: user.email,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    });
    redirectUrl = checkout.redirectUrl;

    if (checkout.providerRef) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: checkout.providerRef },
      });
    }
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    console.error("No se pudo iniciar el pago", error);
    return { error: "No pudimos iniciar el pago. Inténtalo nuevamente en unos minutos." };
  }

  redirect(redirectUrl);
}
