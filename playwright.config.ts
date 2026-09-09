import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * Pruebas de extremo a extremo.
 *
 * Recorren el sitio como lo haría una persona: publicar, contactar, ofertar,
 * calificar, moderar. Son las que evitan que un cambio rompa la publicación o
 * las ofertas sin que nadie se entere hasta producción.
 *
 * Necesitan una base con los datos iniciales:
 *   npm run db:deploy && npm run db:seed && npm run e2e
 */

// En entornos donde Chromium ya viene instalado aparte, se usa ese binario.
const chromiumPropio = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // comparten una sola base de datos
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3210",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(chromiumPropio && existsSync(chromiumPropio)
      ? { launchOptions: { executablePath: chromiumPropio } }
      : {}),
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Si ya hay un servidor escuchando, se reutiliza en vez de levantar otro.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start -- -p 3210",
        url: "http://localhost:3210/api/salud",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
