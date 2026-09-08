import "server-only";
import type { Plan } from "@/lib/plans";

/**
 * Capa de pagos.
 *
 * `createCheckout` devuelve la URL a la que hay que enviar al usuario y la
 * referencia del proveedor para conciliar después. La confirmación ocurre en
 * /api/pagos/webhook (notificación del proveedor) o en el retorno del usuario.
 *
 * Proveedores:
 * - `dev`: aprueba el pago al volver, sin cobrar. Es el que se usa mientras no
 *   haya credenciales; nunca debe quedar activo en producción.
 * - `mercadopago`: crea una preferencia real vía API REST. Requiere
 *   MP_ACCESS_TOKEN. La acreditación se confirma en el webhook.
 *
 * Para sumar Webpay (Transbank) basta con implementar otro objeto con esta
 * misma interfaz y registrarlo en PROVIDERS.
 */

export type CheckoutRequest = {
  paymentId: string;
  plan: Plan;
  listingTitle: string;
  payerEmail: string;
  siteUrl: string;
};

export type CheckoutResult = {
  /// A dónde redirigir al usuario para pagar.
  redirectUrl: string;
  /// Identificador del cobro en el proveedor, si ya lo entrega.
  providerRef?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}

const devProvider: PaymentProvider = {
  name: "dev",
  async createCheckout({ paymentId, siteUrl }) {
    return { redirectUrl: `${siteUrl}/pagos/retorno?pago=${paymentId}&simulado=1` };
  },
};

const mercadoPagoProvider: PaymentProvider = {
  name: "mercadopago",
  async createCheckout({ paymentId, plan, listingTitle, payerEmail, siteUrl }) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("Falta MP_ACCESS_TOKEN");

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        // external_reference es lo que devuelve el webhook para saber qué pago acreditar.
        external_reference: paymentId,
        items: [
          {
            id: plan.code,
            title: `${plan.name} — ${listingTitle}`.slice(0, 250),
            quantity: 1,
            currency_id: "CLP",
            unit_price: plan.price,
          },
        ],
        payer: { email: payerEmail },
        back_urls: {
          success: `${siteUrl}/pagos/retorno?pago=${paymentId}`,
          pending: `${siteUrl}/pagos/retorno?pago=${paymentId}`,
          failure: `${siteUrl}/pagos/retorno?pago=${paymentId}`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/pagos/webhook`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mercado Pago respondió ${response.status}: ${await response.text()}`);
    }

    const preference = (await response.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
    const redirectUrl = preference.init_point ?? preference.sandbox_init_point;
    if (!redirectUrl) throw new Error("Mercado Pago no devolvió una URL de pago");

    return { redirectUrl, providerRef: preference.id };
  },
};

const PROVIDERS: Record<string, PaymentProvider> = {
  dev: devProvider,
  mercadopago: mercadoPagoProvider,
};

/// Proveedor activo según PAYMENT_PROVIDER (por defecto `dev`).
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "dev";
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Proveedor de pago desconocido: ${name}`);
  return provider;
}

/// Consulta a Mercado Pago el estado real de un pago notificado por webhook.
export async function fetchMercadoPagoPayment(paymentId: string): Promise<{
  status: string;
  externalReference: string | null;
} | null> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const payment = (await response.json()) as { status?: string; external_reference?: string };
  return { status: payment.status ?? "unknown", externalReference: payment.external_reference ?? null };
}
