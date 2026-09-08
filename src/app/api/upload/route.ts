import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

/// Sube una imagen: valida, normaliza a WebP, genera miniatura y la guarda
/// en el almacenamiento configurado (disco local o S3/R2).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato no permitido (usa JPG, PNG, WEBP o AVIF)" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "La imagen supera los 8 MB" }, { status: 413 });
  }

  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(stored);
  } catch (error) {
    console.error("Error al procesar la imagen", error);
    return NextResponse.json({ error: "No pudimos procesar la imagen" }, { status: 500 });
  }
}
