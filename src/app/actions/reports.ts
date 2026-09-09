"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  REPORT_REASONS,
  USER_REPORT_REASONS,
  type ReportReason,
  type UserReportReason,
} from "@/lib/reports";

export type ReportState = { error?: string; ok?: boolean } | undefined;

/// Denuncia de un aviso. No requiere cuenta, pero se limita por usuario/aviso
/// para que el formulario no sirva para hostigar a un vendedor.
export async function reportListingAction(_state: ReportState, formData: FormData): Promise<ReportState> {
  const listingId = String(formData.get("listingId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000);

  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return { error: "Elige un motivo" };
  }

  const user = await getCurrentUser();
  const limit = checkRateLimit(`report:${user?.id ?? "anon"}:${listingId}`, 2, 3600);
  if (!limit.allowed) return { error: "Ya recibimos tu denuncia. La estamos revisando." };

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) return { error: "El aviso no existe" };

  await prisma.report.create({
    data: { listingId: listing.id, userId: user?.id ?? null, reason, detail: detail || null },
  });

  revalidatePath("/admin/denuncias");
  return { ok: true };
}

/// Denuncia a una persona. Requiere cuenta: una acusación anónima contra
/// alguien con nombre y apellido es demasiado fácil de usar para hostigar.
export async function reportUserAction(_state: ReportState, formData: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa a tu cuenta para denunciar a un usuario" };

  const subjectId = String(formData.get("subjectId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000);

  if (!USER_REPORT_REASONS.includes(reason as UserReportReason)) {
    return { error: "Elige un motivo" };
  }
  if (subjectId === user.id) return { error: "No puedes denunciarte a ti mismo" };

  const limit = checkRateLimit(`report-user:${user.id}:${subjectId}`, 1, 24 * 3600);
  if (!limit.allowed) return { error: "Ya denunciaste a esta persona. La estamos revisando." };

  const subject = await prisma.user.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) return { error: "La cuenta no existe" };

  await prisma.report.create({
    data: { subjectId: subject.id, userId: user.id, reason, detail: detail || null },
  });

  revalidatePath("/admin/denuncias");
  return { ok: true };
}
