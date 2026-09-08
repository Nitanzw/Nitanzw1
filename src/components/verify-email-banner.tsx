"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/app/actions/auth";

/// Recordatorio de verificación de correo. No bloquea nada: el sello de
/// "correo verificado" es una señal de confianza, no un requisito para publicar.
export function VerifyEmailBanner() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <MailWarning className="size-5 shrink-0" />
      <p className="flex-1">
        {sent
          ? "Te reenviamos el correo de verificación. Revisa tu bandeja y la carpeta de spam."
          : "Verifica tu correo para mostrar el sello de confianza en tus avisos."}
      </p>
      {!sent && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resendVerificationAction();
              setSent(true);
            })
          }
          className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Reenviar correo"}
        </button>
      )}
    </div>
  );
}
