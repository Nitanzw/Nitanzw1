import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Lado de base de datos de las calificaciones.
 *
 * La regla que sostiene todo el sistema: **solo se puede calificar a alguien con
 * quien hubo una conversación por un aviso**. Sin ese contacto previo no hay
 * reseña posible, y cada participante deja una sola. Eso es lo que hace caro
 * fabricar reputación falsa.
 */

export type ReviewTarget = {
  conversationId: string;
  listingId: string;
  listingTitle: string;
  subjectId: string;
  subjectName: string;
  role: "BUYER" | "SELLER";
};

/// Devuelve los datos para calificar dentro de una conversación, o null si esta
/// persona no puede hacerlo (no participó, o ya calificó).
export async function reviewTargetFor(
  conversationId: string,
  userId: string,
): Promise<ReviewTarget | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      reviews: { where: { authorId: userId }, select: { id: true } },
      _count: { select: { messages: true } },
    },
  });

  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;
  if (conversation.reviews.length > 0) return null;
  // Una conversación sin mensajes no es un contacto.
  if (conversation._count.messages === 0) return null;

  const isBuyer = conversation.buyerId === userId;
  const subject = isBuyer ? conversation.seller : conversation.buyer;

  return {
    conversationId: conversation.id,
    listingId: conversation.listing.id,
    listingTitle: conversation.listing.title,
    subjectId: subject.id,
    subjectName: subject.name,
    role: isBuyer ? "BUYER" : "SELLER",
  };
}

/// Recalcula la reputación desde la tabla de reseñas. No suma ni resta sobre el
/// valor anterior a propósito: si algo quedó mal una vez, la siguiente reseña lo
/// deja correcto de nuevo.
export async function recalculateReputation(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const aggregate = await client.review.aggregate({
    where: { subjectId: userId },
    _count: { _all: true },
    _sum: { rating: true },
  });

  await client.user.update({
    where: { id: userId },
    data: {
      ratingCount: aggregate._count._all,
      ratingSum: aggregate._sum.rating ?? 0,
    },
  });
}
