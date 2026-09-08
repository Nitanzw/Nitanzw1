"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export type ProfileState = { error?: string; ok?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre"),
  phone: z.string().trim().max(20).optional().or(z.literal("").transform(() => undefined)),
  bio: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export async function updateProfileAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      bio: parsed.data.bio ?? null,
    },
  });

  revalidatePath("/mi-cuenta/perfil");
  return { ok: "Datos actualizados" };
}

export async function changePasswordAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres" };

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return { error: "La contraseña actual no es correcta" };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Contraseña actualizada" };
}
