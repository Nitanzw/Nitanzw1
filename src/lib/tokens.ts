import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Tokens de un solo uso para verificar el correo y restablecer la contraseña.
 * En la base solo queda el hash: si alguien lee la tabla, no puede usarlos.
 */

const TTL_MINUTES: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 60 * 24, // 24 horas
  PASSWORD_RESET: 60,          // 1 hora
};

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/// Crea un token y devuelve el valor en claro, que solo viaja por correo.
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  // Un token vigente por tipo y usuario: el nuevo invalida los anteriores.
  await prisma.token.deleteMany({ where: { userId, type, usedAt: null } });

  const token = randomBytes(32).toString("base64url");
  await prisma.token.create({
    data: {
      userId,
      type,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + TTL_MINUTES[type] * 60 * 1000),
    },
  });

  return token;
}

/// Consume un token: lo valida y lo marca usado en una sola operación.
export async function consumeToken(token: string, type: TokenType): Promise<{ userId: string } | null> {
  const record = await prisma.token.findUnique({ where: { tokenHash: hash(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;

  // updateMany con usedAt: null evita que dos peticiones simultáneas lo usen dos veces.
  const consumed = await prisma.token.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count === 0) return null;

  return { userId: record.userId };
}
