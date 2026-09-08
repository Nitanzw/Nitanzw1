"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startConversationAction } from "@/app/actions/messages";

export function ContactSeller({
  listingId,
  loggedIn,
  slug,
}: {
  listingId: string;
  loggedIn: boolean;
  slug: string;
}) {
  const [state, action, pending] = useActionState(startConversationAction, undefined);

  if (!loggedIn) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Escríbele al vendedor</h2>
        <p className="mt-1 text-sm text-ink-500">Ingresa a tu cuenta para enviar un mensaje.</p>
        <Link
          href={`/ingresar?next=${encodeURIComponent(`/aviso/${slug}`)}`}
          className="mt-3 block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-ink-900">Escríbele al vendedor</h2>
      <input type="hidden" name="listingId" value={listingId} />

      {state?.ok ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Mensaje enviado. Sigue la conversación en{" "}
          <Link href="/mi-cuenta/mensajes" className="font-semibold underline">
            tus mensajes
          </Link>
          .
        </p>
      ) : (
        <>
          {state?.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
          <textarea
            name="body"
            rows={4}
            required
            defaultValue="Hola, ¿sigue disponible?"
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar mensaje"}
          </button>
        </>
      )}
    </form>
  );
}
