import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const PAGES: Record<string, { title: string; blocks: string[] }> = {
  "como-publicar": {
    title: "Cómo publicar en oktienda.cl",
    blocks: [
      "Crea tu cuenta gratis con tu correo y teléfono. Solo toma un minuto.",
      "Entra a “Publicar”, elige el rubro y la subcategoría que mejor describa lo que ofreces. Según la categoría te pediremos datos extra (año y kilometraje en autos, dormitorios y superficie en propiedades, etc.).",
      "Sube hasta 10 fotos. La primera es la portada y es la que más influye en que hagan clic en tu aviso: usa buena luz y muestra el producto completo.",
      "Escribe un título claro y una descripción honesta con el estado real, accesorios incluidos y forma de entrega.",
      "Tu aviso queda publicado al instante y activo por 60 días. Puedes pausarlo, marcarlo como vendido o eliminarlo cuando quieras desde “Mis avisos”.",
    ],
  },
  "consejos-de-seguridad": {
    title: "Consejos de seguridad",
    blocks: [
      "Concreta las entregas en lugares públicos y concurridos, de día y acompañado si es posible.",
      "Revisa el producto antes de pagar. Si es un vehículo, pide la revisión técnica y el certificado de anotaciones vigentes.",
      "Desconfía de precios muy por debajo del mercado y de quienes te apuran para transferir.",
      "Nunca compartas códigos de verificación que te lleguen por SMS o WhatsApp: nadie de oktienda.cl te los pedirá.",
      "Si un aviso te parece sospechoso, denúncialo desde la ficha del aviso para que lo revisemos.",
    ],
  },
  terminos: {
    title: "Términos y condiciones",
    blocks: [
      "oktienda.cl es una plataforma de clasificados que conecta a personas que compran y venden. No participamos en la negociación, el pago ni la entrega de los productos o servicios publicados.",
      "Cada usuario es responsable del contenido de sus avisos y de cumplir la legislación chilena aplicable, incluida la Ley 19.496 sobre protección de los derechos de los consumidores cuando corresponda.",
      "No se permiten avisos de productos ilegales, falsificados, armas, medicamentos, animales protegidos ni contenido que infrinja derechos de terceros. Los avisos que incumplan estas reglas se eliminan sin aviso previo.",
      "Tratamos los datos personales conforme a la Ley 19.628. Puedes solicitar la eliminación de tu cuenta y de tus datos escribiendo a contacto@oktienda.cl.",
      "Este texto es una base editable: revísalo con tu asesor legal antes de salir a producción.",
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGES[slug]?.title ?? "Ayuda" };
}

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-500 hover:text-brand-700">← Volver al inicio</Link>
      <h1 className="mt-3 text-3xl font-bold text-ink-900">{page.title}</h1>
      <div className="mt-6 space-y-4">
        {page.blocks.map((block) => (
          <p key={block} className="leading-relaxed text-ink-700">
            {block}
          </p>
        ))}
      </div>
    </article>
  );
}
