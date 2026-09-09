import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/report-error";

export const dynamic = "force-dynamic";

/**
 * Estado del servicio, para el chequeo del hosting o del balanceador.
 *
 * Comprueba que la aplicación responde **y** que la base contesta: un proceso
 * vivo con la base caída no sirve de nada, y es justo el caso en que conviene
 * que el hosting reinicie o deje de mandar tráfico.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      estado: "ok",
      base: "ok",
      msBase: Date.now() - startedAt,
    });
  } catch (error) {
    await reportError(error, { where: "api/salud" });
    return NextResponse.json({ estado: "degradado", base: "sin conexión" }, { status: 503 });
  }
}
