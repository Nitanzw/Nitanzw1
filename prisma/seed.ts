import { PrismaClient, Vertical } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

const REGIONS: { code: string; name: string; communes: string[] }[] = [
  { code: "XV", name: "Arica y Parinacota", communes: ["Arica", "Putre"] },
  { code: "I", name: "Tarapacá", communes: ["Iquique", "Alto Hospicio", "Pozo Almonte"] },
  { code: "II", name: "Antofagasta", communes: ["Antofagasta", "Calama", "Tocopilla", "Mejillones"] },
  { code: "III", name: "Atacama", communes: ["Copiapó", "Vallenar", "Caldera", "Chañaral"] },
  { code: "IV", name: "Coquimbo", communes: ["La Serena", "Coquimbo", "Ovalle", "Illapel"] },
  {
    code: "V",
    name: "Valparaíso",
    communes: ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "San Antonio", "Quillota", "La Calera", "Los Andes", "San Felipe"],
  },
  {
    code: "RM",
    name: "Metropolitana de Santiago",
    communes: [
      "Santiago", "Providencia", "Las Condes", "Vitacura", "Lo Barnechea", "Ñuñoa", "La Reina", "Macul",
      "Peñalolén", "La Florida", "Puente Alto", "San Bernardo", "Maipú", "Pudahuel", "Cerrillos",
      "Estación Central", "Quinta Normal", "Recoleta", "Independencia", "Conchalí", "Huechuraba",
      "Quilicura", "Renca", "Colina", "Lampa", "San Miguel", "La Cisterna", "El Bosque", "La Granja",
      "San Joaquín", "Pedro Aguirre Cerda", "Lo Espejo", "La Pintana", "Melipilla", "Talagante", "Buin",
    ],
  },
  { code: "VI", name: "O'Higgins", communes: ["Rancagua", "San Fernando", "Machalí", "Santa Cruz", "Pichilemu"] },
  { code: "VII", name: "Maule", communes: ["Talca", "Curicó", "Linares", "Constitución", "Cauquenes"] },
  { code: "XVI", name: "Ñuble", communes: ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes"] },
  { code: "VIII", name: "Biobío", communes: ["Concepción", "Talcahuano", "San Pedro de la Paz", "Chiguayante", "Coronel", "Los Ángeles", "Hualpén"] },
  { code: "IX", name: "La Araucanía", communes: ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol"] },
  { code: "XIV", name: "Los Ríos", communes: ["Valdivia", "La Unión", "Panguipulli", "Río Bueno"] },
  { code: "X", name: "Los Lagos", communes: ["Puerto Montt", "Osorno", "Puerto Varas", "Castro", "Ancud"] },
  { code: "XI", name: "Aysén", communes: ["Coyhaique", "Puerto Aysén"] },
  { code: "XII", name: "Magallanes", communes: ["Punta Arenas", "Puerto Natales"] },
];

type CategorySeed = {
  name: string;
  icon: string;
  vertical: Vertical;
  children: string[];
};

const CATEGORIES: CategorySeed[] = [
  {
    name: "Vehículos",
    icon: "car",
    vertical: "VEHICLES",
    children: ["Autos y camionetas", "Motos", "Camiones y buses", "Repuestos y accesorios", "Náutica"],
  },
  {
    name: "Propiedades",
    icon: "home",
    vertical: "REAL_ESTATE",
    children: ["Casas", "Departamentos", "Terrenos y parcelas", "Oficinas y locales", "Estacionamientos y bodegas"],
  },
  {
    name: "Tecnología",
    icon: "laptop",
    vertical: "GENERAL",
    children: ["Celulares", "Computadores", "Consolas y videojuegos", "Audio y TV", "Fotografía"],
  },
  {
    name: "Hogar y muebles",
    icon: "sofa",
    vertical: "GENERAL",
    children: ["Muebles", "Electrodomésticos", "Decoración", "Jardín y terraza", "Herramientas"],
  },
  {
    name: "Moda y belleza",
    icon: "shirt",
    vertical: "GENERAL",
    children: ["Ropa mujer", "Ropa hombre", "Calzado", "Accesorios", "Belleza y cuidado personal"],
  },
  {
    name: "Deportes y outdoor",
    icon: "bike",
    vertical: "GENERAL",
    children: ["Bicicletas", "Camping", "Gimnasio", "Deportes de equipo"],
  },
  {
    name: "Bebés y niños",
    icon: "baby",
    vertical: "GENERAL",
    children: ["Coches y sillas", "Ropa infantil", "Juguetes"],
  },
  {
    name: "Mascotas",
    icon: "dog",
    vertical: "GENERAL",
    children: ["Accesorios", "Alimento", "Adopción"],
  },
  {
    name: "Servicios",
    icon: "wrench",
    vertical: "SERVICES",
    children: ["Construcción y remodelación", "Fletes y mudanzas", "Clases particulares", "Belleza a domicilio", "Tecnología y soporte"],
  },
  {
    name: "Empleos",
    icon: "briefcase",
    vertical: "JOBS",
    children: ["Administración", "Ventas", "Gastronomía", "Construcción", "Transporte"],
  },
];

async function main() {
  console.log("Sembrando regiones y comunas…");
  for (const [index, region] of REGIONS.entries()) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name, position: index },
      create: { code: region.code, name: region.name, position: index },
    });
    for (const commune of region.communes) {
      const slug = slugify(`${commune}-${region.code}`);
      await prisma.commune.upsert({
        where: { slug },
        update: { name: commune, regionId: created.id },
        create: { slug, name: commune, regionId: created.id },
      });
    }
  }

  console.log("Sembrando categorías…");
  for (const [index, category] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(category.name) },
      update: { name: category.name, icon: category.icon, vertical: category.vertical, position: index },
      create: {
        slug: slugify(category.name),
        name: category.name,
        icon: category.icon,
        vertical: category.vertical,
        position: index,
      },
    });
    for (const [childIndex, child] of category.children.entries()) {
      await prisma.category.upsert({
        where: { slug: slugify(`${category.name}-${child}`) },
        update: { name: child, vertical: category.vertical, parentId: parent.id, position: childIndex },
        create: {
          slug: slugify(`${category.name}-${child}`),
          name: child,
          vertical: category.vertical,
          parentId: parent.id,
          position: childIndex,
        },
      });
    }
  }

  console.log("Creando cuenta demo y avisos de ejemplo…");
  const demo = await prisma.user.upsert({
    where: { email: "demo@oktienda.cl" },
    update: {},
    create: {
      email: "demo@oktienda.cl",
      name: "Vendedor Demo",
      phone: "+56912345678",
      passwordHash: await bcrypt.hash("oktienda123", 12),
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@oktienda.cl";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Administración oktienda",
      role: "ADMIN",
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "oktienda123", 12),
    },
  });

  const santiago = await prisma.commune.findFirst({ where: { name: "Santiago" } });
  const vina = await prisma.commune.findFirst({ where: { name: "Viña del Mar" } });

  const samples = [
    {
      title: "Toyota Yaris Sport 2020 único dueño",
      categorySlug: slugify("Vehículos-Autos y camionetas"),
      price: 9800000,
      description:
        "Toyota Yaris Sport 1.5 año 2020, mantenciones al día en concesionario, sin choques ni multas. Se recibe vehículo menor valor.",
      communeId: santiago?.id,
      attributes: { brand: "Toyota", model: "Yaris Sport", year: 2020, mileage: 45000, fuel: "Bencina", transmission: "Manual", singleOwner: true },
      condition: "USED" as const,
    },
    {
      title: "Departamento 2D 2B con vista al mar en Viña",
      categorySlug: slugify("Propiedades-Departamentos"),
      price: 4200,
      currency: "UF" as const,
      description:
        "Departamento de 2 dormitorios y 2 baños en pleno centro de Viña del Mar, orientación norponiente, edificio con piscina y gimnasio.",
      communeId: vina?.id,
      attributes: { operation: "Venta", propertyType: "Departamento", bedrooms: 2, bathrooms: 2, totalArea: 78, parkingSpaces: 1, storage: true },
    },
    {
      title: "iPhone 14 Pro 256GB impecable con caja",
      categorySlug: slugify("Tecnología-Celulares"),
      price: 549000,
      description: "iPhone 14 Pro 256GB color morado, batería 92%, liberado, con caja y cable original. Sin detalles.",
      communeId: santiago?.id,
      attributes: { brand: "Apple", model: "iPhone 14 Pro" },
      condition: "USED" as const,
    },
    {
      title: "Fletes y mudanzas en toda la RM",
      categorySlug: slugify("Servicios-Fletes y mudanzas"),
      price: null,
      priceType: "ON_REQUEST" as const,
      description: "Camión ¾ con peoneta incluido. Mudanzas de casa y oficina, retiro de escombros. Cotiza sin compromiso.",
      communeId: santiago?.id,
      attributes: { modality: "A domicilio", experienceYears: 8, invoice: true },
    },
  ];

  for (const sample of samples) {
    const category = await prisma.category.findUnique({ where: { slug: sample.categorySlug } });
    if (!category) continue;
    const slug = slugify(sample.title);
    const exists = await prisma.listing.findFirst({ where: { slug, userId: demo.id } });
    if (exists) continue;

    await prisma.listing.create({
      data: {
        slug,
        title: sample.title,
        description: sample.description,
        price: sample.price ?? null,
        currency: sample.currency ?? "CLP",
        priceType: sample.priceType ?? "FIXED",
        condition: sample.condition ?? null,
        status: "ACTIVE",
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        attributes: sample.attributes,
        categoryId: category.id,
        userId: demo.id,
        communeId: sample.communeId ?? null,
        contactPhone: demo.phone,
        contactWhatsapp: true,
      },
    });
  }

  console.log("Creando conversaciones y calificaciones de ejemplo…");
  const compradora = await prisma.user.upsert({
    where: { email: "compradora@oktienda.cl" },
    update: {},
    create: {
      email: "compradora@oktienda.cl",
      name: "Camila Rojas",
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash("oktienda123", 12),
    },
  });

  // Una calificación solo puede existir sobre una conversación real: el seed
  // arma el contacto completo (conversación + mensaje) antes de calificar.
  const primerAviso = await prisma.listing.findFirst({ where: { userId: demo.id }, orderBy: { createdAt: "asc" } });
  if (primerAviso) {
    const conversation = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId: primerAviso.id, buyerId: compradora.id } },
      update: {},
      create: { listingId: primerAviso.id, buyerId: compradora.id, sellerId: demo.id },
    });

    const tieneMensajes = await prisma.message.count({ where: { conversationId: conversation.id } });
    if (tieneMensajes === 0) {
      await prisma.message.create({
        data: { conversationId: conversation.id, senderId: compradora.id, body: "Hola, ¿sigue disponible?" },
      });
      await prisma.message.create({
        data: { conversationId: conversation.id, senderId: demo.id, body: "Sí, disponible. ¿Cuándo lo pasas a ver?" },
      });
    }

    const yaCalificado = await prisma.review.findFirst({
      where: { conversationId: conversation.id, authorId: compradora.id },
    });
    if (!yaCalificado) {
      await prisma.review.create({
        data: {
          conversationId: conversation.id,
          listingId: primerAviso.id,
          authorId: compradora.id,
          subjectId: demo.id,
          role: "BUYER",
          rating: 5,
          comment: "Respondió al tiro y el auto estaba tal cual la descripción. Recomendado.",
          dealDone: true,
        },
      });

      const resumen = await prisma.review.aggregate({
        where: { subjectId: demo.id },
        _count: { _all: true },
        _sum: { rating: true },
      });
      await prisma.user.update({
        where: { id: demo.id },
        data: { ratingCount: resumen._count._all, ratingSum: resumen._sum.rating ?? 0 },
      });
    }
  }

  console.log("Listo.");
  console.log("  Vendedor demo: demo@oktienda.cl / oktienda123");
  console.log(`  Administrador: ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ?? "oktienda123"}`);
  console.log("  Compradora:    compradora@oktienda.cl / oktienda123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
