import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión" };

/// Lo que ve alguien que abrió la aplicación sin señal.
export default function SinConexionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <WifiOff className="mx-auto size-12 text-ink-500" />
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Sin conexión</h1>
      <p className="mt-2 text-ink-500">
        No pudimos cargar oktienda.cl. Revisa tu conexión y vuelve a intentarlo: los
        avisos y las subastas se muestran siempre al día, nunca con datos guardados.
      </p>
    </div>
  );
}
