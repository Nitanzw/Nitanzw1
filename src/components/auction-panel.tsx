"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Gavel, Lock, TrendingUp } from "lucide-react";
import { placeBidAction } from "@/app/actions/auctions";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import { type Urgency } from "@/lib/auctions";
import { Countdown } from "@/components/countdown";

export type AuctionPanelData = {
  auctionId: string;
  status: "ACTIVE" | "WON" | "NO_BIDS" | "RESERVE_NOT_MET" | "CANCELLED";
  startPrice: number;
  minIncrement: number;
  minimum: number;
  endsAt: string;
  extensionMinutes: number;
  extended: boolean;
  countdownLabel: string;
  urgency: Urgency;
  reserveMet: boolean | null;
  bidCount: number;
  highest: { amount: number; bidderName: string } | null;
  bids: { id: string; amount: number; bidderName: string; createdAt: string }[];
  isSeller: boolean;
  isWinning: boolean;
  loggedIn: boolean;
  from: string;
};

const CLOSED_LABEL: Record<string, string> = {
  WON: "Subasta cerrada con ganador",
  NO_BIDS: "Subasta cerrada sin ofertas",
  RESERVE_NOT_MET: "Subasta cerrada: no se alcanzó el precio de reserva",
  CANCELLED: "Subasta cancelada por el vendedor",
};

export function AuctionPanel({ data }: { data: AuctionPanelData }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(placeBidAction, undefined);
  const [urgency, setUrgency] = useState<Urgency>(data.urgency);

  const handleUrgency = useCallback((next: Urgency) => setUrgency(next), []);

  /**
   * Mientras la subasta esté por cerrar, la ficha se refresca sola: en los
   * últimos minutos alguien puede ofertar en cualquier momento, y quedarse
   * mirando una oferta vieja es justo lo que hace perder una subasta.
   * Al cerrar, un último refresco trae el resultado.
   */
  useEffect(() => {
    if (data.status !== "ACTIVE") return;
    if (urgency === "normal") return;

    if (urgency === "closed") {
      const timer = setTimeout(() => router.refresh(), 2000);
      return () => clearTimeout(timer);
    }

    const every = urgency === "final" ? 10_000 : 60_000;
    const timer = setInterval(() => router.refresh(), every);
    return () => clearInterval(timer);
  }, [urgency, data.status, router]);

  const closed = data.status !== "ACTIVE" || urgency === "closed";
  const minimum = state?.ok && state.amount ? state.amount + data.minIncrement : data.minimum;

  return (
    <section className="overflow-hidden rounded-xl border-2 border-amber-300 bg-white">
      <header className="flex items-center justify-between gap-2 bg-amber-50 px-5 py-3">
        <span className="flex items-center gap-2 font-bold text-amber-900">
          <Gavel className="size-5" /> Subasta
        </span>
        <Countdown
          endsAt={data.endsAt}
          initialLabel={data.countdownLabel}
          initialUrgency={data.urgency}
          variant="panel"
          onFinalMinutes={handleUrgency}
        />
      </header>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm text-ink-500">
            {data.highest ? "Oferta más alta" : "Precio inicial"}
          </p>
          <p className="text-3xl font-black text-ink-900">
            {formatPrice(data.highest?.amount ?? data.startPrice)}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {data.bidCount} {data.bidCount === 1 ? "oferta" : "ofertas"}
            {data.highest && ` · va ganando ${data.highest.bidderName}`}
          </p>
        </div>

        {!closed && urgency === "final" && (
          <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <AlarmClock className="size-4 animate-pulse" />
            ¡Últimos minutos! Una oferta ahora extiende el cierre {data.extensionMinutes} minutos.
          </p>
        )}

        {data.reserveMet !== null && (
          <p
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
              data.reserveMet ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-ink-700"
            }`}
          >
            <Lock className="size-4" />
            {data.reserveMet
              ? "Precio de reserva alcanzado: se vende al mejor postor"
              : "Todavía no se alcanza el precio de reserva"}
          </p>
        )}

        {data.extended && !closed && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TrendingUp className="size-4" />
            El cierre se extendió por ofertas de último minuto
          </p>
        )}

        {closed ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-ink-700">
            {CLOSED_LABEL[data.status] ?? "Subasta cerrada"}
          </p>
        ) : data.isSeller ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-ink-700">
            Es tu subasta. Al cerrar te ponemos en contacto con el ganador.
          </p>
        ) : (
          <form action={action} className="space-y-2">
            <input type="hidden" name="auctionId" value={data.auctionId} />
            <input type="hidden" name="from" value={data.from} />

            {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
            {state?.ok && (
              <p className="text-sm text-brand-700">
                Oferta registrada por {formatPrice(state.amount ?? 0)}
                {state.extended && " · el cierre se extendió"}
              </p>
            )}

            {data.isWinning && !state?.error && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                Vas ganando esta subasta
              </p>
            )}

            <label className="block text-sm font-medium text-ink-700">
              Tu oferta (mínimo {formatPrice(minimum)})
              <input
                name="amount"
                inputMode="numeric"
                required
                defaultValue={minimum}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {pending ? "Enviando oferta…" : data.loggedIn ? "Ofertar" : "Ingresa para ofertar"}
            </button>

            <p className="text-xs text-ink-500">
              Ofertar es un compromiso: si ganas, el vendedor te contactará para
              concretar. No se cobra nada por el sitio.
            </p>
          </form>
        )}

        {data.bids.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Historial de ofertas</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {data.bids.map((bid) => (
                <li key={bid.id} className="flex items-center justify-between py-1.5">
                  <span className="text-ink-700">{bid.bidderName}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">{formatPrice(bid.amount)}</span>
                    <span className="text-xs text-ink-500">{formatRelativeDate(bid.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
