import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Subida de imágenes al disco local (public/uploads).
 * Para producción con varias instancias conviene cambiar el destino por S3/R2:
 * solo hay que reemplazar el bloque de escritura y devolver la URL pública.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });
  }

  const extension = ALLOWED[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no permitido (usa JPG, PNG, WEBP o AVIF)" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera los 6 MB" }, { status: 413 });
  }

  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });

  const name = `${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
