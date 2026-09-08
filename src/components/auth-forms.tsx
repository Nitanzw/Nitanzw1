"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
  type AuthState,
} from "@/app/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400";

function ErrorMessage({ state }: { state: (AuthState & { sent?: boolean }) | undefined }) {
  if (!state?.error) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {state.error}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Un momento…" : label}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/mi-cuenta"} />
      <ErrorMessage state={state} />
      <label className="block text-sm font-medium text-ink-700">
        Correo
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      <p className="text-right text-sm">
        <Link href="/recuperar" className="text-brand-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <SubmitButton pending={pending} label="Ingresar" />
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <ErrorMessage state={state} />
      <label className="block text-sm font-medium text-ink-700">
        Nombre
        <input name="name" required autoComplete="name" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Correo
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Teléfono <span className="font-normal text-ink-500">(opcional)</span>
        <input name="phone" placeholder="+56 9 1234 5678" autoComplete="tel" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <SubmitButton pending={pending} label="Crear cuenta" />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.sent) {
    return (
      <p className="mt-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
        Si ese correo tiene una cuenta en oktienda.cl, le enviamos un enlace para crear una
        contraseña nueva. Revisa también la carpeta de spam.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <ErrorMessage state={state} />
      <label className="block text-sm font-medium text-ink-700">
        Correo
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <SubmitButton pending={pending} label="Enviarme el enlace" />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <ErrorMessage state={state} />
      <label className="block text-sm font-medium text-ink-700">
        Nueva contraseña
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Repite la contraseña
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <SubmitButton pending={pending} label="Guardar contraseña" />
    </form>
  );
}
