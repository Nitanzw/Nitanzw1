import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";
import { formatRelativeDate, listingHref } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  dealDone: boolean;
  reply: string | null;
  createdAt: Date;
  role: "BUYER" | "SELLER";
  author: { id: string; name: string };
  listing: { id: string; slug: string; title: string };
};

/// Listado público de calificaciones recibidas.
export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
        Todavía no tiene calificaciones. Se reciben después de conversar por un aviso.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars rating={review.rating} />
            <Link href={`/vendedor/${review.author.id}`} className="text-sm font-medium text-ink-900 hover:text-brand-700">
              {review.author.name}
            </Link>
            <span className="text-xs text-ink-500">
              {review.role === "BUYER" ? "como comprador" : "como vendedor"} ·{" "}
              {formatRelativeDate(review.createdAt)}
            </span>
            {!review.dealDone && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-500">
                No se concretó el trato
              </span>
            )}
          </div>

          {review.comment && <p className="mt-2 text-sm text-ink-700">{review.comment}</p>}

          <Link
            href={listingHref(review.listing)}
            className="mt-2 block truncate text-xs text-ink-500 hover:text-brand-700"
          >
            Por: {review.listing.title}
          </Link>

          {review.reply && (
            <div className="mt-3 rounded-lg border-l-2 border-brand-300 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-ink-700">Respuesta</p>
              <p className="mt-1 text-sm text-ink-700">{review.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
