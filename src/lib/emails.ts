import "server-only";
import { sendMail } from "@/lib/mail";
import { issueToken } from "@/lib/tokens";

/// Plantillas de los correos transaccionales. Agregar uno nuevo es agregar una
/// función acá y llamarla desde la acción correspondiente.

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendVerificationEmail(user: { id: string; name: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, "EMAIL_VERIFICATION");
  const link = `${siteUrl()}/verificar-correo?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Confirma tu correo en oktienda.cl",
    text: [
      `Hola ${user.name.split(" ")[0]},`,
      "",
      "Confirma tu correo para que los compradores puedan contactarte con confianza:",
      link,
      "",
      "El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.",
      "",
      "— oktienda.cl",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail(user: { id: string; name: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, "PASSWORD_RESET");
  const link = `${siteUrl()}/restablecer?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Restablece tu contraseña de oktienda.cl",
    text: [
      `Hola ${user.name.split(" ")[0]},`,
      "",
      "Recibimos una solicitud para cambiar tu contraseña. Crea una nueva acá:",
      link,
      "",
      "El enlace vence en 1 hora y solo puede usarse una vez.",
      "Si no lo pediste, no tienes que hacer nada: tu contraseña actual sigue funcionando.",
      "",
      "— oktienda.cl",
    ].join("\n"),
  });
}

export async function sendNewMessageEmail(
  seller: { name: string; email: string },
  listingTitle: string,
  conversationId: string,
): Promise<void> {
  await sendMail({
    to: seller.email,
    subject: `Tienes un mensaje nuevo por "${listingTitle}"`,
    text: [
      `Hola ${seller.name.split(" ")[0]},`,
      "",
      `Alguien te escribió por tu aviso "${listingTitle}".`,
      `Respóndele acá: ${siteUrl()}/mi-cuenta/mensajes/${conversationId}`,
      "",
      "— oktienda.cl",
    ].join("\n"),
  });
}

export async function sendSavedSearchAlertEmail(
  user: { name: string; email: string },
  search: { id: string; name: string; query: string },
  listings: { id: string; slug: string; title: string; priceLabel: string; communeName: string | null }[],
): Promise<boolean> {
  const site = siteUrl();
  const lines = listings.map(
    (listing) =>
      `• ${listing.title} — ${listing.priceLabel}${listing.communeName ? ` (${listing.communeName})` : ""}\n  ${site}/aviso/${listing.slug}-${listing.id}`,
  );

  return sendMail({
    to: user.email,
    subject:
      listings.length === 1
        ? `Un aviso nuevo para "${search.name}"`
        : `${listings.length} avisos nuevos para "${search.name}"`,
    text: [
      `Hola ${user.name.split(" ")[0]},`,
      "",
      `Aparecieron avisos nuevos que calzan con tu búsqueda guardada "${search.name}":`,
      "",
      ...lines,
      "",
      `Ver todos los resultados: ${site}/buscar?${search.query}`,
      `Dejar de recibir estos avisos: ${site}/mi-cuenta/busquedas`,
      "",
      "— oktienda.cl",
    ].join("\n"),
  });
}
