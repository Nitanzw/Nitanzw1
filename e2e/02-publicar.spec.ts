import { expect, test } from "@playwright/test";
import { publicar, registrarse } from "./utiles";
import { crearFoto } from "./fixtures";

test.describe("Ciclo de vida de un aviso", () => {
  test("publicar, aparecer en la búsqueda, editar, pausar, vender y eliminar", async ({ page }) => {
    await registrarse(page, "Bruno Vendedor");
    const foto = await crearFoto("aviso");

    const titulo = `Escritorio de roble ${Date.now()}`;
    const url = await publicar(page, {
      rubro: "Hogar y muebles",
      subcategoria: "Muebles",
      titulo,
      descripcion: "Escritorio sólido de roble, 140x70, con dos cajones. Impecable, poco uso.",
      precio: "180000",
      foto,
    });

    // La ficha muestra lo publicado
    await expect(page.getByText("$180.000")).toBeVisible();
    await expect(page.locator('img[src^="/uploads"]').first()).toBeVisible();

    // Y aparece en la búsqueda, incluso buscando sin tildes ni plural exacto
    await page.goto(`/buscar?q=escritorios+roble`);
    await expect(page.getByRole("link", { name: new RegExp(titulo.slice(0, 20)) }).first()).toBeVisible();

    // Editar: cambia el precio y conserva la identidad del aviso
    const id = url.split("-").pop()!;
    await page.goto(`/mi-cuenta/avisos/${id}/editar`);
    await expect(page.locator('input[name="title"]')).toHaveValue(titulo);
    await page.fill('input[name="price"]', "150000");
    await page.click('main button[type="submit"]:has-text("Guardar cambios")');
    await page.waitForURL("**/aviso/**");
    await expect(page.getByText("$150.000")).toBeVisible();
    expect(page.url()).toContain(id);

    // Pausar lo saca de los resultados
    await page.goto("/mi-cuenta");
    await page.click('button:has-text("Pausar")');
    await expect(page.getByText("Pausado")).toBeVisible();
    await page.goto(`/buscar?q=${encodeURIComponent(titulo)}`);
    await expect(page.getByRole("link", { name: new RegExp(titulo.slice(0, 20)) })).toHaveCount(0);

    // Reactivar y marcar vendido
    await page.goto("/mi-cuenta");
    await page.click('button:has-text("Activar")');
    await expect(page.getByText("Activo")).toBeVisible();
    await page.click('button:has-text("Marcar vendido")');
    await expect(page.getByText("Vendido")).toBeVisible();

    // Eliminar
    await page.click('button:has-text("Eliminar")');
    await expect(page.getByText("Todavía no tienes avisos")).toBeVisible();
  });

  test("un aviso ajeno no se puede editar", async ({ page, browser }) => {
    await registrarse(page, "Carla Dueña");
    const url = await publicar(page, {
      rubro: "Tecnología",
      subcategoria: "Celulares",
      titulo: `Teléfono de prueba ${Date.now()}`,
      descripcion: "Teléfono en buen estado para probar los permisos de edición.",
      precio: "90000",
    });
    const id = url.split("-").pop()!;

    const otra = await browser.newPage();
    await registrarse(otra, "Diego Curioso");
    const respuesta = await otra.goto(`/mi-cuenta/avisos/${id}/editar`);
    expect(respuesta?.status()).toBe(404);
    await otra.close();
  });
});
