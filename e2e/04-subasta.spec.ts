import { expect, test } from "@playwright/test";
import { correrCron, publicar, registrarse } from "./utiles";
import { adelantarCierre, cierreEnMinutos, db } from "./db";

test.afterAll(async () => {
  await db.$disconnect();
});

test.describe("Subasta de punta a punta", () => {
  test("ofertar, respetar el incremento, cerrar y poner en contacto al ganador", async ({ browser }) => {
    const vendedor = await browser.newPage();
    await registrarse(vendedor, "Hugo Rematador");
    const titulo = `Guitarra eléctrica ${Date.now()}`;
    const url = await publicar(vendedor, {
      rubro: "Deportes y outdoor",
      subcategoria: "Bicicletas",
      titulo,
      descripcion: "Bicicleta de ruta en muy buen estado, se remata al mejor postor.",
      subasta: { precioInicial: "100000", incremento: "10000", reserva: "150000", dias: "3" },
    });

    // El vendedor no puede ofertar en lo suyo, y la reserva no se ve
    const panel = vendedor.locator("section").filter({ hasText: "Subasta" }).first();
    await expect(panel.getByText("Es tu subasta")).toBeVisible();
    await expect(panel.getByText("150.000")).toHaveCount(0);

    const ana = await browser.newPage();
    await registrarse(ana, "Ana Postora");
    await ana.goto(url);
    // La cuenta regresiva del panel: "2d 23h" con días por delante.
    await expect(ana.locator("section").filter({ hasText: "Subasta" }).first().getByText(/\d+d \d+h/)).toBeVisible();

    // Por debajo del mínimo, rechazada
    await ana.fill('input[name="amount"]', "90000");
    await ana.click('button:has-text("Ofertar")');
    await expect(ana.getByText(/La oferta mínima es/)).toBeVisible();

    // Al precio inicial, aceptada
    await ana.fill('input[name="amount"]', "100000");
    await ana.click('button:has-text("Ofertar")');
    await expect(ana.getByText("Oferta registrada")).toBeVisible();
    await expect(ana.getByText("Todavía no se alcanza el precio de reserva")).toBeVisible();

    // Ana no puede ofertar contra sí misma
    await ana.reload();
    await expect(ana.getByText("Vas ganando esta subasta")).toBeVisible();
    await ana.fill('input[name="amount"]', "120000");
    await ana.click('button:has-text("Ofertar")');
    await expect(ana.getByText("Ya tienes la oferta más alta")).toBeVisible();

    // Beto la supera y alcanza la reserva
    const beto = await browser.newPage();
    await registrarse(beto, "Beto Postor");
    await beto.goto(url);
    await expect(beto.getByText("va ganando Ana")).toBeVisible();
    await beto.fill('input[name="amount"]', "105000");
    await beto.click('button:has-text("Ofertar")');
    await expect(beto.getByText(/La oferta mínima es/)).toBeVisible();

    await beto.fill('input[name="amount"]', "160000");
    await beto.click('button:has-text("Ofertar")');
    await expect(beto.getByText("Oferta registrada")).toBeVisible();
    await expect(beto.getByText("Precio de reserva alcanzado")).toBeVisible();

    // A Ana le avisan que la superaron: campanita y estado de sus ofertas
    await ana.goto("/mi-cuenta/notificaciones");
    await expect(ana.getByText("Te superaron la oferta")).toBeVisible();
    await ana.goto("/mi-cuenta/ofertas");
    await expect(ana.getByText("Te superaron")).toBeVisible();

    const id = url.split("-").pop()!;

    // Con el cierre a la vuelta de la esquina, la ficha entra en "últimos minutos"
    await cierreEnMinutos(id, 5);
    await beto.goto(url);
    await expect(beto.getByText("¡Últimos minutos!")).toBeVisible();

    // Y una oferta ahí extiende el cierre, en vez de dejar ganar al último segundo
    const antes = await db.auction.findFirstOrThrow({ where: { listingId: id }, select: { endsAt: true } });
    await ana.goto(url);
    await ana.fill('input[name="amount"]', "170000");
    await ana.click('button:has-text("Ofertar")');
    await expect(ana.getByText("Oferta registrada")).toBeVisible();
    const despues = await db.auction.findFirstOrThrow({ where: { listingId: id }, select: { endsAt: true } });
    expect(despues.endsAt.getTime()).toBeGreaterThan(antes.endsAt.getTime());

    // El cierre lo hace el cron
    await adelantarCierre(id);
    const resultado = await correrCron(vendedor, "subastas");
    expect(resultado.auctionsClosed).toBeGreaterThanOrEqual(1);

    // Gana Ana: se le avisa y se abre el contacto con el vendedor
    await ana.goto("/mi-cuenta/ofertas");
    await expect(ana.getByText("Ganaste")).toBeVisible();
    await ana.goto("/mi-cuenta/notificaciones");
    await expect(ana.getByText("¡Ganaste la subasta!")).toBeVisible();

    await ana.goto("/mi-cuenta/mensajes");
    await ana.locator('main a[href^="/mi-cuenta/mensajes/"]').first().click();
    await ana.waitForURL("**/mi-cuenta/mensajes/**");
    await expect(ana.getByText(/Subasta cerrada: la oferta ganadora fue de/)).toBeVisible();

    // Y tras la subasta se pueden calificar, como en cualquier venta
    await expect(ana.getByText("¿Cómo te fue con")).toBeVisible();

    // La subasta cerrada ya no acepta ofertas
    await beto.goto(url);
    await expect(beto.getByText("Subasta cerrada con ganador")).toBeVisible();
    await expect(beto.locator('input[name="amount"]')).toHaveCount(0);

    await vendedor.close();
    await ana.close();
    await beto.close();
  });
});
