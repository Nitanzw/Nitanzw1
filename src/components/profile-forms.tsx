"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type ProfileState } from "@/app/actions/profile";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400";
const labelClass = "block text-sm font-medium text-ink-700";

function Feedback({ state }: { state: ProfileState }) {
  if (state?.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{state.ok}</p>;
  return null;
}

export function ProfileForms({
  user,
}: {
  user: { name: string; email: string; phone: string | null; bio: string | null };
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, undefined);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={profileAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Datos personales</h2>
        <Feedback state={profileState} />

        <label className={labelClass}>
          Nombre
          <input name="name" defaultValue={user.name} required className={inputClass} />
        </label>

        <label className={labelClass}>
          Correo
          <input value={user.email} disabled className={`${inputClass} bg-slate-100`} />
        </label>

        <label className={labelClass}>
          Teléfono
          <input name="phone" defaultValue={user.phone ?? ""} placeholder="+56 9 1234 5678" className={inputClass} />
        </label>

        <label className={labelClass}>
          Sobre mí
          <textarea name="bio" defaultValue={user.bio ?? ""} rows={4} maxLength={500} className={inputClass} />
        </label>

        <button
          type="submit"
          disabled={profilePending}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {profilePending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <form action={passwordAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Cambiar contraseña</h2>
        <Feedback state={passwordState} />

        <label className={labelClass}>
          Contraseña actual
          <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
        </label>

        <label className={labelClass}>
          Nueva contraseña
          <input name="next" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>

        <button
          type="submit"
          disabled={passwordPending}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {passwordPending ? "Guardando…" : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
