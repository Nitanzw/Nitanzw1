import { expect, test } from "@playwright/test";
import { publicar, registrarse } from "./utiles";
import { db, hacerAdministrador } from "./db";

test.afterAll(async () => {
  await db.$disconnect();
});

test.describe("Moderación", () => {
  test("denunciar un aviso, bajarlo y suspender la cuenta", async ({ browser }) => {
    const sospechoso = await browser.newPage();
    const correoSospechoso = await registrarse(sospechoso, "Iván Sospechoso");
    const titulo = `iPhone sellado barato ${Date.now()}`;
    const url = await publicar(sospechoso, {
      rubro: "Tecnología",
      subcategoria: "Celulares",
      titulo,
      descripcion: "Vendo iPhone sellado muy por debajo del mercado, solo transferencia anticipada.",
      precio: "150000",
    });

    // Alguien lo denuncia
    const denunciante = await browser.newPage();
    await registrarse(denunciante, "Javiera Atenta");
    await denunciante.goto(url);
    await denunciante.click('button:has-text("Denunciar este aviso")');
    await denunciante.selectOption('select[name="reason"]', "Posible estafa");
    // El detalle lleva el título, único por corrida: la base acumula denuncias
    // de corridas anteriores y si no, el selector se vuelve ambiguo.
    await denunciante.fill('textarea[name="detail"]', `Pide transferencia antes de mostrar ${titulo}`);
    await denunciante.click('button:has-text("Enviar denuncia")');
    await expect(denunciante.getByText("Un moderador revisará")).toBeVisible();

    // Y también denuncia la cuenta desde el perfil
    await denunciante.goto(url);
    await denunciante.getByRole("link", { name: "Iván Sospechoso" }).first().click();
    await denunciante.waitForURL("**/vendedor/**");
    await denunciante.click('button:has-text("Denunciar a Iván")');
    await denunciante.selectOption('select[name="reason"]', "Pidió transferencia por adelantado");
    await denunciante.click('button:has-text("Enviar denuncia")');
    await expect(denunciante.getByText("Un moderador va a revisar esta cuenta")).toBeVisible();

    // El administrador ve ambas denuncias
    const admin = await browser.newPage();
    const correoAdmin = await registrarse(admin, "Karla Admin");
    // El rol se lee de la base en cada petición: no hace falta volver a entrar.
    await hacerAdministrador(correoAdmin);

    await admin.goto("/admin/denuncias");
    const denunciaDelAviso = admin
      .locator("div.rounded-xl")
      .filter({ hasText: `Pide transferencia antes de mostrar ${titulo}` })
      .first();
    await expect(denunciaDelAviso).toBeVisible();
    await expect(admin.getByRole("link", { name: new RegExp(correoSospechoso) }).first()).toBeVisible();

    // Baja el aviso denunciado y desaparece de los resultados
    await denunciaDelAviso.getByRole("button", { name: "Bajar aviso" }).click();
    await admin.goto(`/buscar?q=${encodeURIComponent(titulo)}`);
    await expect(admin.getByRole("link", { name: new RegExp(titulo.slice(0, 15)) })).toHaveCount(0);

    // El dueño se entera por la campanita
    await sospechoso.goto("/mi-cuenta/notificaciones");
    await expect(sospechoso.getByText("Bajamos tu aviso")).toBeVisible();

    // Suspende la cuenta
    await admin.goto(`/admin/usuarios?q=${encodeURIComponent(correoSospechoso)}`);
    await admin.fill('input[name="reason"]', "Publica productos inexistentes");
    await admin.click('button:has-text("Suspender")');
    await expect(admin.getByText("Suspendida")).toBeVisible();

    // La sesión deja de valer, el perfil desaparece y no puede volver a entrar
    await sospechoso.goto("/mi-cuenta");
    await expect(sospechoso).toHaveURL(/ingresar/);

    const perfil = await denunciante.goto(denunciante.url());
    expect(perfil?.status()).toBe(404);

    await sospechoso.goto("/ingresar");
    await sospechoso.fill('input[name="email"]', correoSospechoso);
    await sospechoso.fill('input[name="password"]', "claveDePrueba123");
    await sospechoso.click('main button[type="submit"]');
    await expect(sospechoso.locator('main [role="alert"]')).toContainText("suspendida");

    await sospechoso.close();
    await denunciante.close();
    await admin.close();
  });

  test("una calificación baja avisa a la moderación", async ({ browser }) => {
    const admin = await browser.newPage();
    const correoAdmin = await registrarse(admin, "Luis Moderador");
    await hacerAdministrador(correoAdmin);

    const vendedor = await browser.newPage();
    await registrarse(vendedor, "Mario Vendedor");
    const url = await publicar(vendedor, {
      rubro: "Hogar y muebles",
      subcategoria: "Decoración",
      titulo: `Lámpara de pie ${Date.now()}`,
      descripcion: "Lámpara de pie de diseño, con ampolleta incluida y cable nuevo.",
      precio: "45000",
    });

    // El comentario lleva una marca única: la base conserva las calificaciones
    // de corridas anteriores.
    const marca = `entrega-${Date.now()}`;
    const comprador = await browser.newPage();
    await registrarse(comprador, "Nicolas Comprador");
    await comprador.goto(url);
    await comprador.fill('aside textarea[name="body"]', "Hola, ¿sigue disponible?");
    await comprador.click('aside button[type="submit"]');
    await expect(comprador.getByText("Mensaje enviado")).toBeVisible();

    await comprador.goto("/mi-cuenta/mensajes");
    await comprador.locator('main a[href^="/mi-cuenta/mensajes/"]').first().click();
    await comprador.waitForURL("**/mi-cuenta/mensajes/**");
    await comprador.click('button[aria-label="1 estrella"]');
    await comprador.fill('textarea[name="comment"]', `Nunca apareció a la entrega (${marca}).`);
    await comprador.click('button:has-text("Publicar calificación")');
    await expect(comprador.getByText("Calificaste a")).toBeVisible();

    await admin.goto("/mi-cuenta/notificaciones");
    await expect(admin.getByText(/Calificación de 1 estrella/)).toBeVisible();

    await admin.goto("/admin/calificaciones?malas=1");
    await expect(admin.getByText(marca)).toBeVisible();

    await admin.close();
    await vendedor.close();
    await comprador.close();
  });
});
