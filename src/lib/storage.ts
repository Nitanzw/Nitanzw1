import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Almacenamiento de imágenes.
 *
 * Driver `local`: escribe en public/uploads. Sirve para desarrollo y para un
 * despliegue en un solo servidor con disco persistente.
 *
 * Driver `s3`: cualquier servicio compatible con S3 (AWS S3, Cloudflare R2,
 * Backblaze B2, MinIO). Es el que corresponde en producción con varias
 * instancias o con despliegues efímeros (Vercel, contenedores).
 *
 * Antes de guardar, toda imagen se normaliza a WebP y se redimensiona: una
 * versión grande para la ficha y una miniatura para las grillas.
 */

export type StoredImage = {
  /// URL pública de la imagen grande.
  url: string;
  /// URL pública de la miniatura.
  thumbnailUrl: string;
};

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 360;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function driver(): "local" | "s3" {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

async function renderVariants(input: Buffer) {
  const base = sharp(input, { failOn: "error" }).rotate();

  const [full, thumbnail] = await Promise.all([
    base
      .clone()
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    base
      .clone()
      .resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: "cover", position: "attention" })
      .webp({ quality: 72 })
      .toBuffer(),
  ]);

  return { full, thumbnail };
}

async function putLocal(key: string, body: Buffer): Promise<string> {
  const target = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return `/uploads/${key}`;
}

async function putS3(key: string, body: Buffer): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const bucket = requireEnv("S3_BUCKET");
  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicBase = requireEnv("S3_PUBLIC_URL").replace(/\/$/, "");
  return `${publicBase}/${key}`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} para el almacenamiento S3`);
  return value;
}

/// Procesa y guarda una imagen; devuelve las URLs públicas.
export async function storeImage(input: Buffer, prefix = "avisos"): Promise<StoredImage> {
  const { full, thumbnail } = await renderVariants(input);
  const id = randomUUID();
  const fullKey = `${prefix}/${id}.webp`;
  const thumbKey = `${prefix}/${id}-thumb.webp`;

  if (driver() === "s3") {
    const [url, thumbnailUrl] = await Promise.all([putS3(fullKey, full), putS3(thumbKey, thumbnail)]);
    return { url, thumbnailUrl };
  }

  const [url, thumbnailUrl] = await Promise.all([
    putLocal(fullKey, full),
    putLocal(thumbKey, thumbnail),
  ]);
  return { url, thumbnailUrl };
}

/// Borra una imagen previamente guardada. Los errores no interrumpen el flujo.
export async function deleteImage(url: string): Promise<void> {
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
      return;
    }

    if (driver() === "s3") {
      const publicBase = requireEnv("S3_PUBLIC_URL").replace(/\/$/, "");
      if (!url.startsWith(publicBase)) return;
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: {
          accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
          secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
        },
      });
      await client.send(
        new DeleteObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: url.slice(publicBase.length + 1) }),
      );
    }
  } catch {
    // Una imagen huérfana no debe romper la operación del usuario.
  }
}
