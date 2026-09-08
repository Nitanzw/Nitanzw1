"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { createReviewAction } from "@/app/actions/reviews";

/// Formulario para calificar a la otra persona de una conversación.
export function ReviewForm({
  conversationId,
  subjectName,
  role,
}: {
  conversationId: string;
  subjectName: string;
  role: "BUYER" | "SELLER";
}) {
  const [state, action, pending] = useActionState(createReviewAction, undefined);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (state?.ok) {
    return (
      <p className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        Gracias por calificar a {subjectName}. Tu opinión ayuda al resto a saber con quién está tratando.
      </p>
    );
  }

  const shown = hovered || rating;

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <h2 className="font-semibold text-ink-900">
          ¿Cómo te fue con {subjectName}?
        </h2>
        <p className="text-sm text-ink-500">
          {role === "BUYER"
            ? "Cuéntale al resto cómo fue tratar con este vendedor."
            : "Cuéntale al resto cómo fue tratar con esta persona interesada."}
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHovered(value)}
            aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
            className="p-1"
          >
            <Star
              className={`size-7 transition ${
                value <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="dealDone"
          defaultChecked
          className="size-4 rounded border-slate-300 accent-emerald-600"
        />
        Concretamos el trato
      </label>

      <textarea
        name="comment"
        rows={3}
        maxLength={600}
        placeholder="¿Respondió rápido? ¿El producto era como se describía? (opcional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Publicar calificación"}
      </button>
    </form>
  );
}
