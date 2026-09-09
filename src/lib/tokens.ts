import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Tokens de un solo uso para verificar el correo y restablecer la contraseña.
 * En la base solo queda el hash: si alguien lee la tabla, no puede usarlos.
 */

const TTL_MINUTES: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 60 * 24, // 24 horas
  PASSWORD_RESET: 60,          // 1 hora
  PHONE_VERIFICATION: 10,      // 10 minutos: el código llega al instante
};

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/// Un código de 6 dígitos se repite entre usuarios, así que se hashea junto al
/// id: dos personas pueden recibir el mismo código sin chocar en la base.
function hashConUsuario(userId: string, codigo: string): string {
  return createHash("sha256").update(`${userId}:${codigo}`).digest("hex");
}

/// Código corto para verificar por SMS. Devuelve el código en claro, que solo
/// viaja en el mensaje.
export async function issuePhoneCode(userId: string): Promise<string> {
  await prisma.token.deleteMany({ where: { userId, type: "PHONE_VERIFICATION", usedAt: null } });

  const codigo = String(randomInt(100_000, 1_000_000));
  await prisma.token.create({
    data: {
      userId,
      type: "PHONE_VERIFICATION",
      tokenHash: hashConUsuario(userId, codigo),
      expiresAt: new Date(Date.now() + TTL_MINUTES.PHONE_VERIFICATION * 60 * 1000),
    },
  });

  return codigo;
}

/// Comprueba el código de una persona concreta y lo marca usado.
export async function consumePhoneCode(userId: string, codigo: string): Promise<boolean> {
  const record = await prisma.token.findUnique({
    where: { tokenHash: hashConUsuario(userId, codigo.trim()) },
  });
  if (!record || record.userId !== userId || record.usedAt || record.expiresAt < new Date()) {
    return false;
  }

  const consumido = await prisma.token.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return consumido.count > 0;
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
