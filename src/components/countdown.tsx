"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Clock } from "lucide-react";
import { countdownInterval, countdownLabel, urgencyOf, type Urgency } from "@/lib/auctions";

/**
 * Cuenta regresiva viva de una subasta.
 *
 * El primer render usa el texto calculado en el servidor (`initialLabel`), no el
 * reloj del navegador: si se calculara acá, el HTML del cliente no calzaría con
 * el del servidor y React avisaría de un desajuste de hidratación. Después de
 * montar, el componente toma el control y actualiza solo.
 *
 * En los últimos minutos corre al segundo y se pinta en rojo: es el único
 * momento en que los segundos deciden algo.
 */
export function Countdown({
  endsAt,
  initialLabel,
  initialUrgency,
  variant = "card",
  onFinalMinutes,
}: {
  endsAt: string;
  initialLabel: string;
  initialUrgency: Urgency;
  variant?: "card" | "panel";
  /// Se llama al entrar en los últimos minutos, para que la ficha empiece a
  /// refrescar las ofertas más seguido.
  onFinalMinutes?: (urgency: Urgency) => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [urgency, setUrgency] = useState<Urgency>(initialUrgency);

  useEffect(() => {
    const target = new Date(endsAt);

    function tick() {
      const now = new Date();
      const nextUrgency = urgencyOf(target, now);
      setLabel(countdownLabel(target, now));
      setUrgency((current) => {
        if (current !== nextUrgency) onFinalMinutes?.(nextUrgency);
        return nextUrgency;
      });
      return nextUrgency;
    }

    let timer: ReturnType<typeof setTimeout>;
    function schedule(current: Urgency) {
      timer = setTimeout(() => schedule(tick()), countdownInterval(current));
    }
    schedule(urgencyOf(target));

    return () => clearTimeout(timer);
  }, [endsAt, onFinalMinutes]);

  const closed = urgency === "closed";
  const final = urgency === "final";

  if (variant === "panel") {
    return (
      <span
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold tabular-nums ${
          final ? "animate-pulse bg-red-600 text-white" : closed ? "text-ink-500" : "text-amber-900"
        }`}
        aria-live={final ? "polite" : "off"}
      >
        {final ? <AlarmClock className="size-4" /> : <Clock className="size-4" />}
        {closed ? "Cerrada" : label}
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 tabular-nums ${
        final ? "font-bold text-red-600" : urgency === "soon" ? "text-red-600" : "text-ink-500"
      }`}
    >
      {final ? <AlarmClock className="size-3 animate-pulse" /> : <Clock className="size-3" />}
      {closed ? "Cerrada" : label}
    </span>
  );
}
