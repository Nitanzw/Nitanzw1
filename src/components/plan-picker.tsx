"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { startCheckoutAction } from "@/app/actions/payments";

type PlanOption = {
  code: string;
  name: string;
  days: number;
  priceLabel: string;
  description: string;
  highlight?: boolean;
};

export function PlanPicker({ listingId, plans }: { listingId: string; plans: PlanOption[] }) {
  const [state, action, pending] = useActionState(startCheckoutAction, undefined);
  const [selected, setSelected] = useState(plans.find((plan) => plan.highlight)?.code ?? plans[0]?.code ?? "");

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="planCode" value={selected} />

      {state?.error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.code === selected;
          return (
            <button
              type="button"
              key={plan.code}
              onClick={() => setSelected(plan.code)}
              className={`relative rounded-xl border-2 p-5 text-left transition ${
                active ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-4 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                  Más elegido
                </span>
              )}
              <p className="font-semibold text-ink-900">{plan.name}</p>
              <p className="mt-1 text-2xl font-black text-brand-700">{plan.priceLabel}</p>
              <p className="mt-2 text-sm text-ink-500">{plan.description}</p>
              {active && (
                <span className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-700">
                  <Check className="size-4" /> Seleccionado
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={pending || !selected}
        className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? "Redirigiendo al pago…" : "Ir a pagar"}
      </button>
    </form>
  );
}
