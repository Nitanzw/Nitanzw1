import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

/// Genera una foto de prueba en disco. Las pruebas necesitan imágenes reales
/// porque el servidor las procesa: una imagen falsa no probaría nada.
export async function crearFoto(nombre: string): Promise<string> {
  const carpeta = await mkdtemp(path.join(tmpdir(), "oktienda-e2e-"));
  const destino = path.join(carpeta, `${nombre}.jpg`);
  await sharp({
    create: { width: 1200, height: 900, channels: 3, background: { r: 40, g: 120, b: 90 } },
  })
    .jpeg()
    .toFile(destino);
  return destino;
}
