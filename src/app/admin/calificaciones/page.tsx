import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import { RatingStars } from "@/components/rating-stars";
import { deleteReviewAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calificaciones" };

/// Moderación de calificaciones: sirve para bajar reseñas usadas como
/// represalia o insulto, que es el modo típico en que se abusa de un sistema
/// de reputación.
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ malas?: string }>;
}) {
  const { malas } = await searchParams;
  const onlyBad = malas === "1";

  const reviews = await prisma.review.findMany({
    where: onlyBad ? { rating: { lte: 2 } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      comment: true,
      reply: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
      subject: { select: { id: true, name: true } },
      listing: { select: { title: true } },
    },
  });

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        <Link
          href="/admin/calificaciones"
          className={`rounded-lg px-3 py-1.5 ${!onlyBad ? "bg-brand-600 text-white" : "bg-white text-ink-700"}`}
        >
          Todas
        </Link>
        <Link
          href="/admin/calificaciones?malas=1"
          className={`rounded-lg px-3 py-1.5 ${onlyBad ? "bg-brand-600 text-white" : "bg-white text-ink-700"}`}
        >
          1 y 2 estrellas
        </Link>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-ink-500">
          No hay calificaciones {onlyBad ? "bajas" : "todavía"}.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-sm text-ink-700">
                      <Link href={`/vendedor/${review.author.id}`} className="font-medium hover:text-brand-700">
                        {review.author.name}
                      </Link>{" "}
                      calificó a{" "}
                      <Link href={`/vendedor/${review.subject.id}`} className="font-medium hover:text-brand-700">
                        {review.subject.name}
                      </Link>
                    </span>
                    <span className="text-xs text-ink-500">{formatRelativeDate(review.createdAt)}</span>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-ink-700">{review.comment}</p>}
                  {review.reply && (
                    <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm text-ink-500">
                      Respuesta: {review.reply}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-500">
                    Por: {review.listing.title} · {review.author.email}
                  </p>
                </div>

                <form action={deleteReviewAction}>
                  <input type="hidden" name="id" value={review.id} />
                  <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
