"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { reportUserAction } from "@/app/actions/reports";
import { USER_REPORT_REASONS } from "@/lib/reports";

/// Denunciar a una persona desde su perfil público.
export function ReportUser({ subjectId, name }: { subjectId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportUserAction, undefined);

  if (state?.ok) {
    return <p className="text-sm text-ink-500">Gracias. Un moderador va a revisar esta cuenta.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-red-600"
      >
        <Flag className="size-4" /> Denunciar a {name.split(" ")[0]}
      </button>
    );
  }

  return (
    <form action={action} className="max-w-md space-y-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <select name="reason" required defaultValue="" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="" disabled>
          ¿Qué pasó?
        </option>
        {USER_REPORT_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>

      <textarea
        name="detail"
        rows={3}
        maxLength={1000}
        placeholder="Cuéntanos lo que ocurrió (opcional, pero ayuda mucho)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar denuncia"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-ink-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
