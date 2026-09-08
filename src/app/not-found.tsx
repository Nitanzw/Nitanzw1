import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-bold text-ink-900">No encontramos esta página</h1>
      <p className="mt-2 text-ink-500">
        Puede que el aviso haya sido eliminado o que la dirección esté mal escrita.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">
          Ir al inicio
        </Link>
        <Link href="/buscar" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-ink-700 hover:bg-slate-50">
          Explorar avisos
        </Link>
      </div>
    </div>
  );
}
