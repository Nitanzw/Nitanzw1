/**
 * Comprueba que el envío de correo está bien configurado, antes de descubrirlo
 * porque un usuario no recibió su enlace de verificación.
 *
 *   npx tsx scripts/probar-correo.ts tu@correo.cl
 */
import { sendMail } from "../src/lib/mail";

async function main() {
  const destino = process.argv[2];
  if (!destino) {
    console.error("Uso: npx tsx scripts/probar-correo.ts tu@correo.cl");
    process.exit(1);
  }

  console.log(`Driver: ${process.env.MAIL_DRIVER ?? "console"}`);
  console.log(`Remitente: ${process.env.MAIL_FROM ?? "(por defecto)"}`);

  const ok = await sendMail({
    to: destino,
    subject: "Prueba de configuración de oktienda.cl",
    text: [
      "Si estás leyendo esto en tu bandeja de entrada, el correo saliente funciona.",
      "",
      "Revisa también que no haya caído en spam: si llegó ahí, falta configurar",
      "SPF y DKIM en el DNS del dominio.",
      "",
      "— oktienda.cl",
    ].join("\n"),
  });

  console.log(ok ? "Envío aceptado por el proveedor." : "El envío falló: revisa el error de más arriba.");
  process.exit(ok ? 0 : 1);
}

main();
