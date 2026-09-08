"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";

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
