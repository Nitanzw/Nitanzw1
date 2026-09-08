import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear nueva contraseña" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-7">
        <h1 className="text-2xl font-bold text-ink-900">Crea una nueva contraseña</h1>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-3 text-sm text-ink-500">
            Este enlace no incluye un token válido.{" "}
            <Link href="/recuperar" className="font-semibold text-brand-700 hover:underline">
              Solicita uno nuevo
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
