import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { select: { title: true, images: { take: 1, orderBy: { position: "asc" } } } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="font-semibold text-ink-900">No tienes conversaciones</p>
        <p className="mt-1 text-sm text-ink-500">
          Cuando escribas a un vendedor —o alguien te escriba— aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {conversations.map((conversation) => {
        const other = conversation.buyerId === user.id ? conversation.seller : conversation.buyer;
        const last = conversation.messages[0];

        return (
          <Link
            key={conversation.id}
            href={`/mi-cuenta/mensajes/${conversation.id}`}
            className="flex items-center gap-3 p-4 hover:bg-slate-50"
          >
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {conversation.listing.images[0] ? (
                 
                <img src={conversation.listing.images[0].thumbnailUrl ?? conversation.listing.images[0].url} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-900">{conversation.listing.title}</p>
              <p className="truncate text-sm text-ink-500">
                <span className="font-medium">{other.name}:</span> {last?.body ?? "—"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-ink-500">{formatRelativeDate(conversation.updatedAt)}</span>
          </Link>
        );
      })}
    </div>
  );
}
