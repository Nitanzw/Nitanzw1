import { expect, test } from "@playwright/test";
import { CLAVE, enlaceDelCorreo, ingresar, registrarse, salir } from "./utiles";

test.describe("Cuenta", () => {
  test("registro, verificación de correo y recuperación de contraseña", async ({ page }) => {
    const correo = await registrarse(page, "Ana Cuenta");

    await expect(page.getByText("Verifica tu correo")).toBeVisible();

    // El enlace de verificación sale por correo; con el driver `console` queda en el log.
    const enlace = enlaceDelCorreo(/http:\/\/localhost:3210\/verificar-correo\?token=[\w-]+/);
    expect(enlace, "el registro debe enviar el correo de verificación").not.toBeNull();

    await page.goto(enlace!);
    await expect(page.getByRole("heading", { name: "Correo verificado" })).toBeVisible();

    // Un token de un solo uso no se puede reutilizar.
    await page.goto(enlace!);
    await expect(page.getByText("El enlace no es válido")).toBeVisible();

    // Recuperar la contraseña
    await salir(page);
    await page.goto("/recuperar");
    await page.fill('input[name="email"]', correo);
    await page.click('main button[type="submit"]');
    await expect(page.getByText("Si ese correo tiene una cuenta")).toBeVisible();

    const reinicio = enlaceDelCorreo(/http:\/\/localhost:3210\/restablecer\?token=[\w-]+/);
    expect(reinicio).not.toBeNull();

    await page.goto(reinicio!);
    await page.fill('input[name="password"]', "otraClaveNueva456");
    await page.fill('input[name="confirm"]', "otraClaveNueva456");
    await page.click('main button[type="submit"]');
    await page.waitForURL("**/mi-cuenta");

    // La clave nueva sirve y la vieja ya no.
    await salir(page);
    await page.goto("/ingresar");
    await page.fill('input[name="email"]', correo);
    await page.fill('input[name="password"]', CLAVE);
    await page.click('main button[type="submit"]');
    await expect(page.locator('main [role="alert"]')).toContainText("incorrectos");

    await ingresar(page, correo, "otraClaveNueva456");
    await expect(page).toHaveURL(/mi-cuenta/);
  });
});
