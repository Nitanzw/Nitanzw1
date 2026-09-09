import { expect, test } from "@playwright/test";
import { publicar, registrarse } from "./utiles";

test.describe("Comprar: contacto, favoritos y calificación", () => {
  test("una compradora contacta, conversa, y ambos se califican", async ({ browser }) => {
    const vendedor = await browser.newPage();
    const correoVendedor = await registrarse(vendedor, "Elena Vendedora");
    const titulo = `Cámara réflex ${Date.now()}`;
    const url = await publicar(vendedor, {
      rubro: "Tecnología",
      subcategoria: "Fotografía",
      titulo,
      descripcion: "Cámara réflex con dos lentes, correa y bolso. Funciona perfecto.",
      precio: "320000",
    });

    const compradora = await browser.newPage();
    await registrarse(compradora, "Fran Compradora");

    // La encuentra buscando y la guarda en favoritos
    await compradora.goto("/buscar?q=camara+reflex");
    await compradora.getByRole("link", { name: new RegExp(titulo.slice(0, 15)) }).first().click();
    await compradora.waitForURL("**/aviso/**");
    await compradora.click('button:has-text("Guardar")');
    await expect(compradora.getByRole("button", { name: /Guardado/ })).toBeVisible();

    await compradora.goto("/mi-cuenta/favoritos");
    await expect(compradora.getByRole("link", { name: new RegExp(titulo.slice(0, 15)) }).first()).toBeVisible();

    // Escribe al vendedor
    await compradora.goto(url);
    await compradora.fill('aside textarea[name="body"]', "Hola, ¿incluye el bolso? ¿Aceptas retiro en Ñuñoa?");
    await compradora.click('aside button[type="submit"]');
    await expect(compradora.getByText("Mensaje enviado")).toBeVisible();

    // El vendedor lo ve, le llega notificación y responde
    await vendedor.goto("/mi-cuenta/notificaciones");
    await expect(vendedor.getByText(/te escribió/)).toBeVisible();
    await vendedor.goto("/mi-cuenta/mensajes");
    await expect(vendedor.getByText("¿incluye el bolso?")).toBeVisible();
    await vendedor.locator('main a[href^="/mi-cuenta/mensajes/"]').first().click();
    await vendedor.waitForURL("**/mi-cuenta/mensajes/**");
    await vendedor.fill('textarea[name="body"]', "Sí, incluye el bolso. Te espero mañana en Ñuñoa.");
    await vendedor.click('button[aria-label="Enviar"]');
    await expect(vendedor.getByText("Te espero mañana")).toBeVisible();

    // La compradora califica al vendedor
    await compradora.goto("/mi-cuenta/mensajes");
    await compradora.locator('main a[href^="/mi-cuenta/mensajes/"]').first().click();
    await compradora.waitForURL("**/mi-cuenta/mensajes/**");
    await expect(compradora.getByText("¿Cómo te fue con")).toBeVisible();
    await compradora.click('button[aria-label="5 estrellas"]');
    await compradora.fill('textarea[name="comment"]', "Todo tal cual lo descrito, muy buena disposición.");
    await compradora.click('button:has-text("Publicar calificación")');
    await expect(compradora.getByText("Calificaste a")).toBeVisible();

    // La reputación aparece en la ficha y en el perfil público
    await compradora.goto(url);
    await expect(compradora.getByText("1 calificación")).toBeVisible();
    await compradora.getByRole("link", { name: "Elena Vendedora" }).first().click();
    await compradora.waitForURL("**/vendedor/**");
    await expect(compradora.getByText("Todo tal cual lo descrito")).toBeVisible();

    // Y el vendedor puede responder esa calificación, una sola vez
    await vendedor.goto("/mi-cuenta/calificaciones");
    await expect(vendedor.getByText("Responder calificaciones")).toBeVisible();
    await vendedor.fill('textarea[name="reply"]', "Gracias Fran, un gusto.");
    await vendedor.click('button:has-text("Responder")');

    // Al responder, esa calificación sale de la lista de pendientes y la
    // respuesta queda publicada junto a ella.
    await expect(vendedor.getByText("Gracias Fran, un gusto.")).toBeVisible();
    await expect(vendedor.getByText("Responder calificaciones")).toHaveCount(0);

    // Y la ve cualquiera en el perfil público del vendedor
    await compradora.reload();
    await expect(compradora.getByText("Gracias Fran, un gusto.")).toBeVisible();

    // Nadie que no haya conversado puede calificar
    const tercero = await browser.newPage();
    await registrarse(tercero, "Gonzalo Ajeno");
    await tercero.goto("/mi-cuenta/mensajes");
    await expect(tercero.getByText("No tienes conversaciones")).toBeVisible();
    await tercero.close();

    // La sesión del vendedor sigue siendo la suya
    await vendedor.goto("/mi-cuenta");
    await expect(vendedor.getByText(correoVendedor)).toBeVisible();

    await vendedor.close();
    await compradora.close();
  });
});
