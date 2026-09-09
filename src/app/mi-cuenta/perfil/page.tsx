import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileForms } from "@/components/profile-forms";
import { PushManager } from "@/components/push-manager";
import { PhoneVerification } from "@/components/phone-verification";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, phone: true, bio: true, phoneVerified: true },
  });

  const dispositivos = await prisma.pushSubscription.count({ where: { userId: session.id } });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Teléfono verificado</h2>
        <p className="mt-1 text-sm text-ink-500">
          Un teléfono verificado da confianza a quien te compra: es la señal más difícil de
          falsificar después de tus calificaciones.
        </p>
        <div className="mt-3">
          <PhoneVerification telefono={user.phone} verificado={Boolean(user.phoneVerified)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-ink-900">Notificaciones en este dispositivo</h2>
        <p className="mt-1 text-sm text-ink-500">
          Te avisamos al instante cuando te escriben, cuando te superan una oferta y cuando
          cierra una subasta en la que participas. Funciona aunque tengas la aplicación cerrada.
          {dispositivos > 0 && ` Ya las tienes activadas en ${dispositivos} ${dispositivos === 1 ? "dispositivo" : "dispositivos"}.`}
        </p>
        <div className="mt-3">
          <PushManager vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        </div>
      </section>

      <ProfileForms user={user} />
    </div>
  );
}
