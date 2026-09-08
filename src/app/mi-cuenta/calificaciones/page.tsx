import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { reputationOf } from "@/lib/reputation";
import { ReputationBadge } from "@/components/rating-stars";
import { ReviewList } from "@/components/review-list";
import { ReviewReplyForm } from "@/components/review-reply-form";
import { formatRelativeDate } from "@/lib/utils";
import { RatingStars } from "@/components/rating-stars";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calificaciones" };

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  dealDone: true,
  reply: true,
  createdAt: true,
  role: true,
  author: { select: { id: true, name: true } },
  listing: { select: { id: true, slug: true, title: true } },
} as const;

export default async function MyReviewsPage() {
  const session = await requireUser();

  const [user, received, written] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: { ratingCount: true, ratingSum: true },
    }),
    prisma.review.findMany({
      where: { subjectId: session.id },
      orderBy: { createdAt: "desc" },
      select: REVIEW_SELECT,
    }),
    prisma.review.findMany({
      where: { authorId: session.id },
      orderBy: { createdAt: "desc" },
      select: { ...REVIEW_SELECT, subject: { select: { id: true, name: true } } },
    }),
  ]);

  const pendingReply = received.filter((review) => !review.reply);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Tu reputación</h2>
        <div className="mt-2">
          <ReputationBadge reputation={reputationOf(user)} size="md" />
        </div>
        <p className="mt-2 text-sm text-ink-500">
          Se construye con las calificaciones de quienes conversaron contigo por un aviso.
          Nadie puede calificarte sin haberte escrito antes.
        </p>
      </section>

      {pendingReply.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink-900">Responder calificaciones</h2>
          <p className="text-sm text-ink-500">
            Puedes responder una vez cada calificación. Tu respuesta se muestra junto a ella.
          </p>
          <div className="mt-3 space-y-3">
            {pendingReply.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <RatingStars rating={review.rating} />
                  <span className="text-sm font-medium text-ink-900">{review.author.name}</span>
                  <span className="text-xs text-ink-500">{formatRelativeDate(review.createdAt)}</span>
                </div>
                {review.comment && <p className="mt-2 text-sm text-ink-700">{review.comment}</p>}
                <div className="mt-3">
                  <ReviewReplyForm reviewId={review.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-ink-900">Calificaciones recibidas</h2>
        <div className="mt-3">
          <ReviewList reviews={received} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink-900">Calificaciones que dejaste</h2>
        {written.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
            Todavía no calificas a nadie. Puedes hacerlo desde{" "}
            <Link href="/mi-cuenta/mensajes" className="font-semibold text-brand-700 hover:underline">
              tus conversaciones
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {written.map((review) => (
              <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <RatingStars rating={review.rating} />
                  <span className="text-sm text-ink-700">
                    Calificaste a{" "}
                    <Link href={`/vendedor/${review.subject.id}`} className="font-medium hover:text-brand-700">
                      {review.subject.name}
                    </Link>
                  </span>
                  <span className="text-xs text-ink-500">{formatRelativeDate(review.createdAt)}</span>
                </div>
                {review.comment && <p className="mt-2 text-sm text-ink-700">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
