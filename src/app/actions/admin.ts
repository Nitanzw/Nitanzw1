"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/// Todas las acciones de administración pasan por acá: sin rol ADMIN no se ejecuta nada.
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  return user;
}

export async function moderateListingAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");

  const statuses: Record<string, ListingStatus> = {
    reject: "REJECTED",
    approve: "ACTIVE",
    pause: "PAUSED",
  };

  if (action === "delete") {
    await prisma.listing.delete({ where: { id } }).catch(() => {});
  } else {
    const status = statuses[action];
    if (!status) return;
    await prisma.listing.update({ where: { id }, data: { status } }).catch(() => {});
  }

  revalidatePath("/admin/avisos");
  revalidatePath("/admin/denuncias");
  revalidatePath("/");
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  await prisma.report.update({ where: { id }, data: { resolvedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/denuncias");
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (id === admin.id) return; // nadie se quita a sí mismo el rol y queda fuera
  if (role !== "ADMIN" && role !== "USER") return;

  await prisma.user.update({ where: { id }, data: { role } }).catch(() => {});
  revalidatePath("/admin/usuarios");
}
