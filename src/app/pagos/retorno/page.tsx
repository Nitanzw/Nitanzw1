import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { confirmPayment } from "@/lib/featuring";
import { listingHref } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estado del pago" };

/**
 * Pantalla de retorno desde el proveedor de pago.
 *
 * Con el proveedor `dev` acredita el pago aquí mismo (no hay cobro real).
 * Con un proveedor real solo muestra el estado: quien acredita es el webhook,
 * que es la única fuente confiable.
 */
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string; simulado?: string }>;
}) {
  const { pago, simulado } = await searchParams;
  const user = await getCurrentUser();

  const payment = pago
    ? await prisma.payment.findUnique({
        where: { id: pago },
        include: { listing: { select: { id: true, slug: true, title: true } } },
      })
    : null;

  if (!payment || !user || payment.userId !== user.id) {
    return (
      <Shell icon={<XCircle className="size-12 text-red-500" />} title="No encontramos este pago">
        <p className="text-ink-500">Revisa el enlace o vuelve a intentarlo desde tus avisos.</p>
        <Actions />
      </Shell>
    );
  }

  if (simulado === "1" && payment.status === "PENDING" && payment.provider === "dev") {
    await confirmPayment(payment.id);
  }

  const current = await prisma.payment.findUniqueOrThrow({
    where: { id: payment.id },
    select: { status: true },
  });

  if (current.status === "PAID") {
    return (
      <Shell icon={<CheckCircle2 className="size-12 text-brand-600" />} title="¡Tu aviso ya está destacado!">
        <p className="text-ink-500">
          {payment.listing.title} aparecerá primero en los resultados durante {payment.days} días.
        </p>
        <Actions listingHref={listingHref(payment.listing)} />
      </Shell>
    );
  }

  if (current.status === "PENDING") {
    return (
      <Shell icon={<Clock className="size-12 text-amber-500" />} title="Estamos confirmando tu pago">
        <p className="text-ink-500">
          Apenas el proveedor nos confirme la transacción, tu aviso quedará destacado
          automáticamente. Puedes cerrar esta página.
        </p>
        <Actions listingHref={listingHref(payment.listing)} />
      </Shell>
    );
  }

  return (
    <Shell icon={<XCircle className="size-12 text-red-500" />} title="El pago no se completó">
      <p className="text-ink-500">No se realizó ningún cobro. Puedes intentarlo nuevamente.</p>
      <Actions listingHref={`/destacar/${payment.listingId}`} />
    </Shell>
  );
}

function Shell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="flex justify-center">{icon}</div>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">{title}</h1>
      <div className="mt-2 space-y-4">{children}</div>
    </div>
  );
}

function Actions({ listingHref: href }: { listingHref?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      {href && (
        <Link href={href} className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
          Ver mi aviso
        </Link>
      )}
      <Link
        href="/mi-cuenta"
        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-ink-700 hover:bg-slate-50"
      >
        Ir a mis avisos
      </Link>
    </div>
  );
}
