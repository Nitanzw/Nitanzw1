"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendNewMessageEmail } from "@/lib/emails";
import { notify } from "@/lib/notifications";

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

  // Tope de mensajes iniciales por usuario: evita el spam a varios vendedores.
  const limit = checkRateLimit(`conversation:${user.id}`, 20, 3600);
  if (!limit.allowed) return { error: "Enviaste muchos mensajes seguidos. Inténtalo más tarde." };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, allowMessages: true, title: true },
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

  const seller = await prisma.user.findUnique({
    where: { id: listing.userId },
    select: { name: true, email: true },
  });
  if (seller) {
    await notify({
      userId: listing.userId,
      type: "MESSAGE",
      title: `${user.name.split(" ")[0]} te escribió`,
      body: `Por tu aviso "${listing.title}"`,
      url: `/mi-cuenta/mensajes/${conversation.id}`,
    });
    await sendNewMessageEmail(seller, listing.title, conversation.id);
  }

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

  const destinatario =
    conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  await notify({
    userId: destinatario,
    type: "MESSAGE",
    title: `${user.name.split(" ")[0]} te respondió`,
    body: body.slice(0, 80),
    url: `/mi-cuenta/mensajes/${conversationId}`,
  });

  revalidatePath(`/mi-cuenta/mensajes/${conversationId}`);
  revalidatePath("/mi-cuenta/mensajes");
  return { ok: true };
}
