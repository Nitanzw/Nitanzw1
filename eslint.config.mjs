import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  { ignores: ["node_modules/**", ".next/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  {
    // Los Server Components se ejecutan una vez por petición en el servidor:
    // leer la hora o la base de datos durante el render es justamente su trabajo.
    files: ["src/app/**/*.tsx", "src/app/**/*.ts"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    rules: {
      // El proyecto usa <img> a propósito: las imágenes ya vienen redimensionadas
      // desde src/lib/storage.ts y pueden servirse desde un CDN externo.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
