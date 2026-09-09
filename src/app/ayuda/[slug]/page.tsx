import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const PAGES: Record<string, { title: string; blocks: string[]; draft?: boolean }> = {
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
    draft: true,
    blocks: [
      "oktienda.cl es una plataforma de clasificados que conecta a personas que compran y venden. No participamos en la negociación, el pago ni la entrega de los productos o servicios publicados, ni retenemos dinero de las partes.",
      "Para publicar hay que crear una cuenta con datos reales. Una cuenta por persona: las cuentas duplicadas o creadas para evadir una suspensión se eliminan.",
      "Cada usuario es responsable del contenido de sus avisos, de tener derecho a vender lo que ofrece y de cumplir la legislación chilena aplicable, incluida la Ley 19.496 sobre protección de los derechos de los consumidores cuando la venta sea habitual o profesional.",
      "No se permiten avisos de productos ilegales, robados o falsificados, armas, medicamentos, drogas, alcohol y tabaco, animales protegidos, documentos oficiales, servicios sexuales, ni contenido que infrinja derechos de terceros. Los avisos que incumplan estas reglas se bajan sin aviso previo y la cuenta puede quedar suspendida.",
      "Las subastas no mueven dinero a través del sitio: una oferta es un compromiso de compra entre las partes, y al cerrar ponemos en contacto al vendedor con el mejor postor. Ofertar y no responder, o vender fuera del remate, se refleja en las calificaciones y puede terminar en la suspensión de la cuenta.",
      "Las calificaciones son opiniones de quienes tuvieron un contacto real por un aviso. Eliminamos las que contengan insultos, datos personales de terceros o acusaciones sin relación con la transacción; no eliminamos una calificación solo porque sea negativa.",
      "Podemos suspender una cuenta o bajar un aviso cuando haya indicios razonables de fraude, suplantación o incumplimiento de estos términos. Si crees que hubo un error, escríbenos a contacto@oktienda.cl y lo revisamos.",
      "El servicio se ofrece tal como está y puede tener interrupciones. oktienda.cl no responde por el resultado de las transacciones entre usuarios, que ocurren fuera de la plataforma.",
      "Estos términos se rigen por la ley chilena. Podemos actualizarlos avisando en el sitio; el uso posterior implica aceptar la versión vigente.",
    ],
  },

  privacidad: {
    title: "Política de privacidad",
    draft: true,
    blocks: [
      "Esta política explica qué datos personales tratamos en oktienda.cl y para qué, conforme a la Ley 19.628 sobre protección de la vida privada.",
      "Qué guardamos: los datos que entregas al crear tu cuenta (nombre, correo y, si lo agregas, teléfono), el contenido de tus avisos y sus fotos, tus mensajes con otros usuarios, tus calificaciones, tus favoritos y búsquedas guardadas, y datos técnicos mínimos como la fecha de tus visitas a un aviso.",
      "Para qué los usamos: para que funcione el sitio (publicar, buscar, contactar y calificar), para avisarte por correo de mensajes, subastas y búsquedas guardadas, para moderar contenido y prevenir fraudes, y para cumplir obligaciones legales.",
      "Qué mostramos en público: tu nombre, tu antigüedad en el sitio, tus avisos activos y las calificaciones que recibiste. Tu correo nunca se muestra; tu teléfono solo aparece si eliges publicarlo en un aviso.",
      "Con quién los compartimos: con los proveedores necesarios para operar (alojamiento, base de datos, envío de correo y almacenamiento de imágenes), que los tratan solo por cuenta nuestra. No vendemos datos personales.",
      "Cuánto los conservamos: mientras tu cuenta exista. Si la eliminas, borramos tus datos personales y tus avisos; conservamos las calificaciones de forma anonimizada, porque son parte de la reputación de otras personas.",
      "Tus derechos: puedes acceder, rectificar, cancelar y oponerte al tratamiento de tus datos escribiendo a contacto@oktienda.cl. Respondemos en un plazo razonable y sin costo.",
      "Cookies: usamos una cookie propia para mantener tu sesión iniciada. No usamos cookies publicitarias ni de seguimiento de terceros.",
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

      {page.draft && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Borrador pendiente de revisión legal.</strong> Este texto describe cómo
          funciona hoy oktienda.cl, pero debe revisarlo un abogado antes de abrir el sitio
          al público.
        </p>
      )}
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
