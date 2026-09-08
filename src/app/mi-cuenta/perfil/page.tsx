import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileForms } from "@/components/profile-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, phone: true, bio: true },
  });

  return <ProfileForms user={user} />;
}
