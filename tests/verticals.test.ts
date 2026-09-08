import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attributesSchema,
  describeAttribute,
  fieldsFor,
  filterableFieldsFor,
  parseAttributes,
} from "../src/lib/verticals.ts";

describe("atributos por vertical", () => {
  it("acepta un aviso de vehículo completo", () => {
    const parsed = parseAttributes("VEHICLES", {
      brand: "Toyota",
      model: "Yaris",
      year: "2020",
      mileage: "45000",
      transmission: "Manual",
      singleOwner: "on",
    });

    assert.equal(parsed.brand, "Toyota");
    assert.equal(parsed.year, 2020, "los números llegan como texto del formulario");
    assert.equal(parsed.singleOwner, true, "los checkbox llegan como 'on'");
  });

  it("descarta campos vacíos en vez de guardarlos", () => {
    const parsed = parseAttributes("VEHICLES", { brand: "Kia", model: "Rio", year: "2018", fuel: "" });
    assert.ok(!("fuel" in parsed));
  });

  it("ignora campos que no pertenecen al vertical", () => {
    const parsed = parseAttributes("REAL_ESTATE", {
      operation: "Venta",
      propertyType: "Casa",
      mileage: "999999",
    });
    assert.ok(!("mileage" in parsed));
  });

  it("rechaza un obligatorio ausente", () => {
    assert.throws(() => parseAttributes("VEHICLES", { brand: "Toyota" }));
  });

  it("rechaza una opción fuera del catálogo", () => {
    assert.throws(() =>
      parseAttributes("VEHICLES", { brand: "X", model: "Y", year: "2020", transmission: "Semiautomática" }),
    );
  });
});

describe("declaración de verticales", () => {
  it("expone filtros solo para los campos marcados", () => {
    const filterables = filterableFieldsFor("REAL_ESTATE").map((field) => field.key);
    assert.ok(filterables.includes("bedrooms"));
    assert.ok(!filterables.includes("builtArea"));
  });

  it("cada select declara sus opciones", () => {
    for (const vertical of ["GENERAL", "VEHICLES", "REAL_ESTATE", "SERVICES", "JOBS"] as const) {
      for (const field of fieldsFor(vertical)) {
        if (field.type === "select") {
          assert.ok(field.options?.length, `${vertical}.${field.key} necesita opciones`);
        }
      }
      assert.doesNotThrow(() => attributesSchema(vertical));
    }
  });

  it("describe atributos para la ficha", () => {
    assert.deepEqual(describeAttribute("VEHICLES", "mileage", 45000), {
      label: "Kilometraje",
      value: "45.000 km",
    });
    assert.deepEqual(describeAttribute("VEHICLES", "singleOwner", true), {
      label: "Único dueño",
      value: "Sí",
    });
    assert.equal(describeAttribute("VEHICLES", "inventado", 1), null);
  });
});
