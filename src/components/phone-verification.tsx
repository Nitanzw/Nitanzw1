"use client";

import { useActionState } from "react";
import { BadgeCheck, Smartphone } from "lucide-react";
import { confirmPhoneCodeAction, requestPhoneCodeAction } from "@/app/actions/phone";

/**
 * Verificación del teléfono por SMS.
 *
 * Es la señal de confianza más cara de falsificar después de la reputación: un
 * número chileno cuesta plata y tiempo, y eso solo desalienta las cuentas
 * desechables que se crean para estafar una vez.
 */
export function PhoneVerification({
  telefono,
  verificado,
}: {
  telefono: string | null;
  verificado: boolean;
}) {
  const [envio, pedirCodigo, pidiendo] = useActionState(requestPhoneCodeAction, undefined);
  const [confirmacion, confirmar, confirmando] = useActionState(confirmPhoneCodeAction, undefined);

  if (verificado || confirmacion?.ok) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        <BadgeCheck className="size-4" />
        Teléfono verificado{telefono ? `: ${telefono}` : ""}
      </p>
    );
  }

  if (envio?.enviado) {
    return (
      <form action={confirmar} className="space-y-3">
        <p className="text-sm text-ink-700">
          Te mandamos un código de 6 dígitos por SMS. Vence en 10 minutos.
        </p>
        {confirmacion?.error && <p className="text-sm text-red-700">{confirmacion.error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="000000"
            className="w-32 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-widest tabular-nums outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={confirmando}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {confirmando ? "Comprobando…" : "Confirmar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={pedirCodigo} className="space-y-3">
      {envio?.error && <p className="text-sm text-red-700">{envio.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="phone"
          defaultValue={telefono ?? ""}
          placeholder="+56 9 1234 5678"
          className="w-52 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={pidiendo}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Smartphone className="size-4" />
          {pidiendo ? "Enviando…" : "Verificar por SMS"}
        </button>
      </div>
      <p className="text-xs text-ink-500">
        Tu número no se muestra en el sitio: solo aparece en tus avisos si tú lo publicas.
      </p>
    </form>
  );
}
