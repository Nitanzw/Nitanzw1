"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

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

  await createSession(user.id);
  redirect("/mi-cuenta");
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/mi-cuenta");

  if (!email || !password) return { error: "Ingresa tu correo y contraseña" };

  const user = await prisma.user.findUnique({ where: { email } });
  // Mensaje genérico a propósito: no revelamos si el correo existe.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/mi-cuenta");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
