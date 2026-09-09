import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/// Utilidades compartidas por las pruebas. Nada de esperas fijas: siempre se
/// espera por algo concreto de la pantalla, que es lo que hace que una prueba
/// falle por un bug y no por el reloj.

export const CLAVE = "claveDePrueba123";

export async function registrarse(page: Page, nombre: string): Promise<string> {
  // El correo se arma desde el nombre, así que hay que quitarle tildes y ñ:
  // un correo con acentos lo rechaza la validación del propio navegador y el
  // formulario nunca llega a enviarse.
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const correo = `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@oktienda.cl`;
  await page.goto("/registro");
  await page.fill('input[name="name"]', nombre);
  await page.fill('input[name="email"]', correo);
  await page.fill('input[name="password"]', CLAVE);
  await page.click('main button[type="submit"]');
  await page.waitForURL("**/mi-cuenta");
  return correo;
}

export async function ingresar(page: Page, correo: string, clave = CLAVE) {
  await page.goto("/ingresar");
  await page.fill('input[name="email"]', correo);
  await page.fill('input[name="password"]', clave);
  await page.click('main button[type="submit"]');
  await page.waitForURL("**/mi-cuenta");
}

export async function salir(page: Page) {
  await page.goto("/mi-cuenta");
  await page.click('button:has-text("Cerrar sesión")');
  await page.waitForURL("/");
}

type DatosAviso = {
  rubro: string;
  subcategoria: string;
  titulo: string;
  descripcion: string;
  precio?: string;
  subasta?: { precioInicial: string; incremento?: string; reserva?: string; dias?: string };
  foto?: string;
};

/// Publica un aviso y devuelve su URL.
export async function publicar(page: Page, datos: DatosAviso): Promise<string> {
  await page.goto("/publicar");
  if (datos.subasta) await page.click('button:has-text("Subasta")');

  const selects = page.locator("main select");
  await selects.nth(0).selectOption({ label: datos.rubro });
  await selects.nth(1).selectOption({ label: datos.subcategoria });

  await page.fill('input[name="title"]', datos.titulo);
  await page.fill('textarea[name="description"]', datos.descripcion);

  if (datos.subasta) {
    await page.fill('input[name="startPrice"]', datos.subasta.precioInicial);
    if (datos.subasta.incremento) await page.fill('input[name="minIncrement"]', datos.subasta.incremento);
    if (datos.subasta.reserva) await page.fill('input[name="reservePrice"]', datos.subasta.reserva);
    await page.selectOption('select[name="durationDays"]', datos.subasta.dias ?? "3");
  } else {
    await page.fill('input[name="price"]', datos.precio ?? "100000");
  }

  if (datos.foto) {
    await page.setInputFiles('input[type="file"]', datos.foto);
    await page.waitForFunction(
      () => (document.querySelector<HTMLInputElement>('input[name="images"]')?.value ?? "").includes("thumbnailUrl"),
      undefined,
      { timeout: 30_000 },
    );
  }

  await page.click('main button[type="submit"]:has-text("Publicar aviso")');
  await page.waitForURL("**/aviso/**");
  await expect(page.locator("h1")).toContainText(datos.titulo);
  return page.url();
}

/// Dispara una tarea programada como lo haría el cron del servidor.
export async function correrCron(page: Page, tarea: "subastas" | "alertas" | "expirar") {
  const respuesta = await page.request.get(`/api/cron/${tarea}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? "secreto-de-prueba"}` },
  });
  expect(respuesta.ok()).toBeTruthy();
  return respuesta.json();
}

/// Lee del log del servidor el último enlace que coincida (los correos del
/// driver `console` quedan ahí).
export function enlaceDelCorreo(patron: RegExp, log = "/tmp/next.log"): string | null {
  try {
    const contenido = readFileSync(log, "utf8");
    const coincidencias = contenido.match(new RegExp(patron, "g"));
    return coincidencias ? coincidencias[coincidencias.length - 1] : null;
  } catch {
    return null;
  }
}
