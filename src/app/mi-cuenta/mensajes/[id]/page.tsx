import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatRelativeDate, listingHref } from "@/lib/utils";
import { ReplyForm } from "@/components/reply-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conversación" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, slug: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    notFound();
  }

  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const other = conversation.buyerId === user.id ? conversation.seller : conversation.buyer;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-t-xl border border-slate-200 bg-white p-4">
        <Link href="/mi-cuenta/mensajes" className="text-sm text-ink-500 hover:text-brand-700">
          ← Volver a mensajes
        </Link>
        <p className="mt-2 font-semibold text-ink-900">{other.name}</p>
        <Link href={listingHref(conversation.listing)} className="text-sm text-brand-700 hover:underline">
          {conversation.listing.title}
        </Link>
      </div>

      <div className="space-y-3 border-x border-slate-200 bg-slate-50 p-4">
        {conversation.messages.map((message) => {
          const mine = message.senderId === user.id;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-brand-600 text-white" : "bg-white text-ink-900 border border-slate-200"
                }`}
              >
                <p className="whitespace-pre-line">{message.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-brand-100" : "text-ink-500"}`}>
                  {formatRelativeDate(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-b-xl border border-slate-200 bg-white p-4">
        <ReplyForm conversationId={conversation.id} />
      </div>
    </div>
  );
}
