"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/emails";
import { consumeToken } from "@/lib/tokens";

export type AuthState = { error?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre"),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,15}$/u, "Ingresa un teléfono válido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Ya existe una cuenta con este correo" };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await sendVerificationEmail(user);
  await createSession(user.id);
  redirect("/mi-cuenta");
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/mi-cuenta");

  if (!email || !password) return { error: "Ingresa tu correo y contraseña" };

  // Freno a la fuerza bruta: 8 intentos por correo cada 10 minutos.
  const limit = checkRateLimit(`login:${email}`, 8, 600);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Vuelve a probar en ${Math.ceil(limit.retryAfter / 60)} minutos.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Mensaje genérico a propósito: no revelamos si el correo existe.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }

  resetRateLimit(`login:${email}`);
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/mi-cuenta");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/// Solicitud de restablecimiento. Responde siempre lo mismo, exista o no la
/// cuenta: así no se puede usar el formulario para descubrir correos registrados.
export async function requestPasswordResetAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState & { sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ingresa tu correo" };

  const limit = checkRateLimit(`reset:${email}`, 3, 900);
  if (limit.allowed) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (user) await sendPasswordResetEmail(user);
  }

  return { sent: true };
}

const resetSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden",
  });

export async function resetPasswordAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };

  const consumed = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!consumed) return { error: "Este enlace ya se usó o venció. Solicita uno nuevo." };

  await prisma.user.update({
    where: { id: consumed.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await createSession(consumed.userId);
  redirect("/mi-cuenta");
}

/// Reenvía el correo de verificación al usuario con sesión iniciada.
export async function resendVerificationAction(): Promise<void> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return;

  const limit = checkRateLimit(`verify:${user.id}`, 3, 900);
  if (!limit.allowed) return;

  await sendVerificationEmail(user);
}
