"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type MessageState = { error?: string; ok?: boolean } | undefined;

/// Un comprador escribe al vendedor desde la ficha del aviso.
export async function startConversationAction(
  _state: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const user = await getCurrentUser();
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/aviso/${listingId}`)}`);
  if (body.length < 2) return { error: "Escribe un mensaje" };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, allowMessages: true },
  });
  if (!listing || !listing.allowMessages) return { error: "Este aviso no recibe mensajes" };
  if (listing.userId === user.id) return { error: "No puedes escribirte a ti mismo" };

  const conversation = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId: listing.id, buyerId: user.id } },
    update: { updatedAt: new Date() },
    create: { listingId: listing.id, buyerId: user.id, sellerId: listing.userId },
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, senderId: user.id, body },
  });

  revalidatePath("/mi-cuenta/mensajes");
  return { ok: true };
}

/// Respuesta dentro de una conversación existente.
export async function replyAction(_state: MessageState, formData: FormData): Promise<MessageState> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1) return { error: "Escribe un mensaje" };

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    return { error: "Conversación no disponible" };
  }

  await prisma.message.create({ data: { conversationId, senderId: user.id, body } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  revalidatePath(`/mi-cuenta/mensajes/${conversationId}`);
  revalidatePath("/mi-cuenta/mensajes");
  return { ok: true };
}
