import "server-only";

/**
 * Envío de correo.
 *
 * `MAIL_DRIVER` elige el transporte:
 * - `console` (por defecto): escribe el correo en el log. Ideal en desarrollo,
 *   no requiere credenciales y deja el enlace a la vista en la terminal.
 * - `smtp`: cualquier servidor SMTP (el del hosting, Gmail, Zoho, Brevo…).
 * - `resend`: API HTTP de Resend, útil en entornos sin SMTP saliente.
 *
 * Para sumar otro proveedor basta agregar una entrada en TRANSPORTS.
 */

export type MailMessage = {
  to: string;
  subject: string;
  /// Cuerpo en texto plano. El HTML se deriva de este si no se entrega.
  text: string;
  html?: string;
};

type Transport = (message: MailMessage) => Promise<void>;

function from(): string {
  return process.env.MAIL_FROM ?? "oktienda.cl <no-reply@oktienda.cl>";
}

const consoleTransport: Transport = async (message) => {
  console.info(
    ["", "─── correo (driver console) ───", `Para:    ${message.to}`, `Asunto:  ${message.subject}`, "", message.text, "───────────────────────────────", ""].join("\n"),
  );
};

const smtpTransport: Transport = async (message) => {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: requireEnv("SMTP_USER"), pass: requireEnv("SMTP_PASSWORD") },
  });

  await transporter.sendMail({
    from: from(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html ?? toHtml(message.text),
  });
};

const resendTransport: Transport = async (message) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html ?? toHtml(message.text),
    }),
  });

  if (!response.ok) throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
};

const TRANSPORTS: Record<string, Transport> = {
  console: consoleTransport,
  smtp: smtpTransport,
  resend: resendTransport,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} para enviar correo`);
  return value;
}

function toHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">${escaped.replace(/\n/g, "<br>")}</div>`;
}

/// Envía un correo. Nunca lanza: un fallo de correo no debe romper el flujo del
/// usuario (el registro se completa aunque el mensaje no salga).
export async function sendMail(message: MailMessage): Promise<boolean> {
  const driver = process.env.MAIL_DRIVER ?? "console";
  const transport = TRANSPORTS[driver];

  if (!transport) {
    console.error(`Driver de correo desconocido: ${driver}`);
    return false;
  }

  try {
    await transport(message);
    return true;
  } catch (error) {
    const { reportError } = await import("@/lib/report-error");
    await reportError(error, { where: "correo", extra: { driver, asunto: message.subject } });
    return false;
  }
}
