import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/mi-cuenta");

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-7">
        <h1 className="text-2xl font-bold text-ink-900">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-ink-500">Publicar en oktienda.cl es gratis.</p>
        <RegisterForm />
        <p className="mt-5 text-center text-sm text-ink-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-semibold text-brand-700 hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
