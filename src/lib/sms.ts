import "server-only";

/**
 * Envío de SMS.
 *
 * Mismo patrón que el correo: un driver por proveedor y la elección por
 * variable de entorno.
 *
 * - `console` (por defecto): escribe el mensaje en el log. Sirve en desarrollo
 *   y no cuesta nada.
 * - `twilio`: envía de verdad. Cada mensaje tiene costo, así que el límite de
 *   intentos por usuario no es una formalidad.
 *
 * Para sumar otro proveedor, agrega una entrada en TRANSPORTES.
 */

type Transporte = (telefono: string, texto: string) => Promise<void>;

const consola: Transporte = async (telefono, texto) => {
  console.info(["", "─── SMS (driver console) ───", `Para: ${telefono}`, texto, "────────────────────────────", ""].join("\n"));
};

const twilio: Transporte = async (telefono, texto) => {
  const sid = requerir("TWILIO_ACCOUNT_SID");
  const token = requerir("TWILIO_AUTH_TOKEN");
  const desde = requerir("TWILIO_FROM");

  const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: telefono, From: desde, Body: texto }),
  });

  if (!respuesta.ok) {
    throw new Error(`Twilio respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
};

const TRANSPORTES: Record<string, Transporte> = { console: consola, twilio };

function requerir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} para enviar SMS`);
  return valor;
}

export async function sendSms(telefono: string, texto: string): Promise<boolean> {
  const driver = process.env.SMS_DRIVER ?? "console";
  const transporte = TRANSPORTES[driver];

  if (!transporte) {
    console.error(`Driver de SMS desconocido: ${driver}`);
    return false;
  }

  try {
    await transporte(telefono, texto);
    return true;
  } catch (error) {
    console.error("No se pudo enviar el SMS", error);
    return false;
  }
}
