"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recalculateReputation } from "@/lib/reviews";
import { sendAccountBlockedEmail } from "@/lib/emails";

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

/// Elimina una calificación abusiva y deja la reputación consistente.
export async function deleteReviewAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const review = await prisma.review.findUnique({ where: { id }, select: { subjectId: true } });
  if (!review) return;

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recalculateReputation(review.subjectId, tx);
  });

  revalidatePath("/admin/calificaciones");
  revalidatePath(`/vendedor/${review.subjectId}`);
}

/**
 * Suspende (o reactiva) una cuenta.
 *
 * Bloquear no es solo marcar al usuario: hay que sacar de circulación lo que
 * dejó publicado. Se pausan sus avisos y se cancelan sus subastas abiertas
 * —nadie pierde dinero porque no hay pagos, pero sí quedaría gente ofertando
 * por algo que ya no se puede concretar—.
 */
export async function toggleUserBlockAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (id === admin.id) return; // un administrador no se bloquea a sí mismo

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, blockedAt: true },
  });
  if (!user) return;

  if (user.blockedAt) {
    await prisma.user.update({ where: { id }, data: { blockedAt: null, blockedReason: null } });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { blockedAt: new Date(), blockedReason: reason || null },
      });
      await tx.listing.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: { status: "PAUSED" },
      });
      await tx.auction.updateMany({
        where: { listing: { userId: id }, status: "ACTIVE" },
        data: { status: "CANCELLED", closedAt: new Date() },
      });
    });

    await sendAccountBlockedEmail(user, reason || null);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/");
}
