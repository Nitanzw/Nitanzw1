import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar correo" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const consumed = token ? await consumeToken(token, "EMAIL_VERIFICATION") : null;

  if (consumed) {
    await prisma.user.update({
      where: { id: consumed.userId },
      data: { emailVerified: new Date() },
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {consumed ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">Correo verificado</h1>
          <p className="mt-2 text-ink-500">
            Listo. Tu cuenta ahora muestra el sello de correo verificado en tus avisos.
          </p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">El enlace no es válido</h1>
          <p className="mt-2 text-ink-500">
            Puede que ya lo hayas usado o que haya vencido. Pide uno nuevo desde tu cuenta.
          </p>
        </>
      )}

      <Link
        href="/mi-cuenta"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
      >
        Ir a mi cuenta
      </Link>
    </div>
  );
}
