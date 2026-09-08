import { Vertical } from "@prisma/client";
import { z } from "zod";

/**
 * Punto de extensión del marketplace.
 *
 * Cada vertical declara los campos extra que pide al publicar y por los que se
 * puede filtrar en la búsqueda. Los valores se guardan en `Listing.attributes`
 * (JSON), así que sumar un vertical nuevo — o un campo nuevo — no requiere
 * migración de base de datos: basta agregarlo aquí.
 */

export type AttributeField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  /// Se muestra como filtro en los resultados de búsqueda.
  filterable?: boolean;
  required?: boolean;
  unit?: string;
  options?: string[];
  placeholder?: string;
};

export type VerticalConfig = {
  label: string;
  fields: AttributeField[];
};

export const VERTICALS: Record<Vertical, VerticalConfig> = {
  GENERAL: {
    label: "General",
    fields: [
      { key: "brand", label: "Marca", type: "text", filterable: true, placeholder: "Ej: Samsung" },
      { key: "model", label: "Modelo", type: "text", placeholder: "Ej: Galaxy S23" },
    ],
  },

  VEHICLES: {
    label: "Vehículos",
    fields: [
      { key: "brand", label: "Marca", type: "text", filterable: true, required: true, placeholder: "Ej: Toyota" },
      { key: "model", label: "Modelo", type: "text", required: true, placeholder: "Ej: Yaris" },
      { key: "year", label: "Año", type: "number", filterable: true, required: true, placeholder: "2020" },
      { key: "mileage", label: "Kilometraje", type: "number", filterable: true, unit: "km", placeholder: "45000" },
      {
        key: "fuel",
        label: "Combustible",
        type: "select",
        filterable: true,
        options: ["Bencina", "Diésel", "Híbrido", "Eléctrico", "Gas"],
      },
      {
        key: "transmission",
        label: "Transmisión",
        type: "select",
        filterable: true,
        options: ["Manual", "Automática"],
      },
      {
        key: "bodyType",
        label: "Carrocería",
        type: "select",
        options: ["Sedán", "Hatchback", "SUV", "Camioneta", "Furgón", "Coupé", "Station Wagon"],
      },
      { key: "doors", label: "Puertas", type: "number" },
      { key: "singleOwner", label: "Único dueño", type: "boolean" },
    ],
  },

  REAL_ESTATE: {
    label: "Propiedades",
    fields: [
      {
        key: "operation",
        label: "Operación",
        type: "select",
        filterable: true,
        required: true,
        options: ["Venta", "Arriendo", "Arriendo temporal"],
      },
      {
        key: "propertyType",
        label: "Tipo de propiedad",
        type: "select",
        filterable: true,
        required: true,
        options: ["Casa", "Departamento", "Oficina", "Local comercial", "Terreno", "Bodega", "Parcela", "Estacionamiento"],
      },
      { key: "bedrooms", label: "Dormitorios", type: "number", filterable: true },
      { key: "bathrooms", label: "Baños", type: "number", filterable: true },
      { key: "totalArea", label: "Superficie total", type: "number", filterable: true, unit: "m²" },
      { key: "builtArea", label: "Superficie construida", type: "number", unit: "m²" },
      { key: "parkingSpaces", label: "Estacionamientos", type: "number" },
      { key: "storage", label: "Bodega", type: "boolean" },
      { key: "commonExpenses", label: "Gastos comunes", type: "number", unit: "$" },
      { key: "furnished", label: "Amoblado", type: "boolean", filterable: true },
    ],
  },

  SERVICES: {
    label: "Servicios",
    fields: [
      {
        key: "modality",
        label: "Modalidad",
        type: "select",
        filterable: true,
        options: ["Presencial", "A domicilio", "Online"],
      },
      { key: "experienceYears", label: "Años de experiencia", type: "number" },
      { key: "invoice", label: "Emite boleta o factura", type: "boolean" },
    ],
  },

  JOBS: {
    label: "Empleos",
    fields: [
      {
        key: "contractType",
        label: "Tipo de contrato",
        type: "select",
        filterable: true,
        options: ["Jornada completa", "Media jornada", "Por turnos", "Freelance", "Práctica"],
      },
      { key: "company", label: "Empresa", type: "text" },
      { key: "remote", label: "Teletrabajo", type: "boolean", filterable: true },
    ],
  },
};

export function fieldsFor(vertical: Vertical): AttributeField[] {
  return VERTICALS[vertical]?.fields ?? [];
}

export function filterableFieldsFor(vertical: Vertical): AttributeField[] {
  return fieldsFor(vertical).filter((f) => f.filterable);
}

/// Esquema zod construido a partir de la definición del vertical.
export function attributesSchema(vertical: Vertical) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fieldsFor(vertical)) {
    let schema: z.ZodTypeAny;
    switch (field.type) {
      case "number":
        schema = z.coerce.number().finite().nonnegative();
        break;
      case "boolean":
        schema = z.coerce.boolean();
        break;
      case "select":
        schema = z.enum([...(field.options ?? [""])] as [string, ...string[]]);
        break;
      default:
        schema = z.string().trim().max(120);
    }
    shape[field.key] = field.required ? schema : schema.optional();
  }

  return z.object(shape);
}

/// Limpia el formulario: descarta vacíos y valida contra el vertical.
export function parseAttributes(vertical: Vertical, raw: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const field of fieldsFor(vertical)) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") continue;
    if (field.type === "boolean") {
      cleaned[field.key] = value === "on" || value === "true" || value === true;
      continue;
    }
    cleaned[field.key] = value;
  }
  return attributesSchema(vertical).parse(cleaned) as Record<string, string | number | boolean>;
}

/// Etiqueta legible de un atributo, para mostrarlo en la ficha del aviso.
export function describeAttribute(vertical: Vertical, key: string, value: unknown): { label: string; value: string } | null {
  const field = fieldsFor(vertical).find((f) => f.key === key);
  if (!field) return null;
  if (field.type === "boolean") return { label: field.label, value: value ? "Sí" : "No" };
  const formatted =
    field.type === "number" && typeof value === "number"
      ? new Intl.NumberFormat("es-CL").format(value)
      : String(value);
  return { label: field.label, value: field.unit ? `${formatted} ${field.unit}` : formatted };
}
