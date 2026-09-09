"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSms } from "@/lib/sms";
import { normalizarTelefono } from "@/lib/utils";
import { consumePhoneCode, issuePhoneCode } from "@/lib/tokens";

export type PhoneState = { error?: string; enviado?: boolean; ok?: boolean } | undefined;

/// Manda el código al teléfono. Cada SMS cuesta, así que el límite es estricto.
export async function requestPhoneCodeAction(_state: PhoneState, formData: FormData): Promise<PhoneState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const telefono = normalizarTelefono(String(formData.get("phone") ?? ""));
  if (!telefono) return { error: "Ingresa un teléfono chileno válido, por ejemplo +56 9 1234 5678" };

  const limite = checkRateLimit(`sms:${user.id}`, 3, 3600);
  if (!limite.allowed) {
    return { error: "Pediste varios códigos seguidos. Espera una hora antes de intentarlo de nuevo." };
  }

  // El teléfono se guarda ya; verificado solo queda cuando confirme el código.
  await prisma.user.update({
    where: { id: user.id },
    data: { phone: telefono, phoneVerified: null },
  });

  const codigo = await issuePhoneCode(user.id);
  const enviado = await sendSms(
    telefono,
    `Tu código de oktienda.cl es ${codigo}. Vence en 10 minutos. Si no lo pediste, ignora este mensaje.`,
  );

  if (!enviado) return { error: "No pudimos enviar el SMS. Inténtalo más tarde." };

  revalidatePath("/mi-cuenta/perfil");
  return { enviado: true };
}

/// Confirma el código y deja el teléfono verificado.
export async function confirmPhoneCodeAction(_state: PhoneState, formData: FormData): Promise<PhoneState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const codigo = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(codigo)) return { error: "El código son 6 dígitos" };

  // Tope de intentos: sin esto, seis dígitos se adivinan a fuerza bruta.
  const limite = checkRateLimit(`sms-verificar:${user.id}`, 5, 900);
  if (!limite.allowed) return { error: "Demasiados intentos. Pide un código nuevo en unos minutos." };

  const valido = await consumePhoneCode(user.id, codigo);
  if (!valido) return { error: "El código no es correcto o ya venció" };

  await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: new Date() } });

  revalidatePath("/mi-cuenta/perfil");
  return { ok: true };
}
