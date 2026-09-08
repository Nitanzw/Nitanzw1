"use client";

import { useActionState } from "react";
import { replyToReviewAction } from "@/app/actions/reviews";

/// Derecho a réplica de quien fue calificado: una sola respuesta, pública.
export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState(replyToReviewAction, undefined);

  if (state?.ok) {
    return <p className="text-sm text-brand-700">Respuesta publicada.</p>;
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <textarea
        name="reply"
        rows={2}
        maxLength={600}
        required
        placeholder="Tu versión de lo ocurrido (se publica junto a la calificación)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Publicando…" : "Responder"}
      </button>
    </form>
  );
}
