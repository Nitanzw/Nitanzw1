import { NextResponse } from "next/server";
import { confirmPayment, failPayment } from "@/lib/featuring";
import { fetchMercadoPagoPayment } from "@/lib/payments";
import { features } from "@/lib/features";

/**
 * Webhook de notificaciones del proveedor de pago.
 *
 * Nunca confía en el cuerpo de la notificación para acreditar: solo toma de ahí
 * el identificador y consulta el estado real contra la API del proveedor.
 * Responde 200 siempre que la notificación se haya procesado, para que el
 * proveedor no la reintente en bucle.
 */
export async function POST(request: Request) {
  if (!features.payments) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const topic = body.type ?? body.action?.split(".")[0] ?? url.searchParams.get("topic");
  const providerPaymentId = body.data?.id ?? url.searchParams.get("id") ?? undefined;

  if (topic !== "payment" || !providerPaymentId) {
    // Otros eventos (merchant_order, tests de conexión) se aceptan sin hacer nada.
    return NextResponse.json({ received: true });
  }

  const payment = await fetchMercadoPagoPayment(String(providerPaymentId));
  if (!payment?.externalReference) {
    return NextResponse.json({ received: true });
  }

  if (payment.status === "approved") {
    await confirmPayment(payment.externalReference, { providerRef: String(providerPaymentId) });
  } else if (["rejected", "cancelled"].includes(payment.status)) {
    await failPayment(payment.externalReference);
  }

  return NextResponse.json({ received: true });
}
