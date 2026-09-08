import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-7">
        <h1 className="text-2xl font-bold text-ink-900">¿Olvidaste tu contraseña?</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ingresa tu correo y te enviaremos un enlace para crear una nueva.
        </p>
        <ForgotPasswordForm />
        <p className="mt-5 text-center text-sm text-ink-500">
          <Link href="/ingresar" className="font-semibold text-brand-700 hover:underline">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
