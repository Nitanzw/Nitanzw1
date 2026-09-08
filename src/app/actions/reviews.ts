"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { features } from "@/lib/features";
import { recalculateReputation, reviewTargetFor } from "@/lib/reviews";
import { checkRateLimit } from "@/lib/rate-limit";

export type ReviewState = { error?: string; ok?: boolean } | undefined;

const reviewSchema = z.object({
  conversationId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Elige de 1 a 5 estrellas").max(5),
  comment: z.string().trim().max(600).optional().or(z.literal("").transform(() => undefined)),
  dealDone: z.coerce.boolean().optional(),
});

/// Calificar a la otra persona de una conversación.
export async function createReviewAction(_state: ReviewState, formData: FormData): Promise<ReviewState> {
  if (!features.reviews) return { error: "Las calificaciones no están disponibles" };

  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const parsed = reviewSchema.safeParse({
    conversationId: formData.get("conversationId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
    dealDone: formData.get("dealDone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa la calificación" };

  const limit = checkRateLimit(`review:${user.id}`, 20, 3600);
  if (!limit.allowed) return { error: "Calificaste muchas veces seguidas. Inténtalo más tarde." };

  // La elegibilidad se vuelve a comprobar acá: el formulario no es la barrera.
  const target = await reviewTargetFor(parsed.data.conversationId, user.id);
  if (!target) return { error: "No puedes calificar esta conversación" };

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        conversationId: target.conversationId,
        listingId: target.listingId,
        authorId: user.id,
        subjectId: target.subjectId,
        role: target.role,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
        dealDone: parsed.data.dealDone ?? false,
      },
    });

    await recalculateReputation(target.subjectId, tx);
  });

  revalidatePath(`/mi-cuenta/mensajes/${target.conversationId}`);
  revalidatePath(`/vendedor/${target.subjectId}`);
  return { ok: true };
}

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().trim().min(2, "Escribe tu respuesta").max(600),
});

/// Derecho a réplica: quien fue calificado puede responder una vez, en público.
export async function replyToReviewAction(_state: ReviewState, formData: FormData): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const parsed = replySchema.safeParse({
    reviewId: formData.get("reviewId"),
    reply: formData.get("reply"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa tu respuesta" };

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    select: { subjectId: true, reply: true },
  });
  if (!review || review.subjectId !== user.id) return { error: "No puedes responder esta calificación" };
  if (review.reply) return { error: "Ya respondiste esta calificación" };

  await prisma.review.update({
    where: { id: parsed.data.reviewId },
    data: { reply: parsed.data.reply, repliedAt: new Date() },
  });

  revalidatePath(`/vendedor/${user.id}`);
  revalidatePath("/mi-cuenta/calificaciones");
  return { ok: true };
}
