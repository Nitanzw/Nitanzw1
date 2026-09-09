/**
 * Interruptores de funcionalidades.
 *
 * Permiten dejar código completo y probado en el repositorio pero apagado en
 * producción, sin tener que borrarlo ni mantener una rama aparte. Se leen de
 * variables de entorno y por defecto quedan como corresponde a la etapa actual
 * del proyecto: un marketplace de contactos, sin cobros.
 *
 * Para encender los destacados pagados el día que corresponda:
 *
 *   FEATURE_PAYMENTS="on"
 *
 * y configurar PAYMENT_PROVIDER con un proveedor real.
 */

function enabled(name: string, byDefault: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return byDefault;
  return value === "on" || value === "true" || value === "1";
}

export const features = {
  /// Planes de destacado pagados: pantalla de compra, checkout y webhook.
  /// Apagado mientras oktienda.cl no cobre. La vigencia ya comprada
  /// (`Listing.featuredUntil`) se respeta igual, y un administrador puede
  /// destacar un aviso a mano desde la base.
  get payments(): boolean {
    return enabled("FEATURE_PAYMENTS", false);
  },

  /// Calificaciones entre usuarios después de un contacto.
  get reviews(): boolean {
    return enabled("FEATURE_REVIEWS", true);
  },

  /// Subastas: publicar un aviso a remate y ofertar por él. Sin pagos: al
  /// cerrar, el sistema pone en contacto al vendedor con el ganador.
  get auctions(): boolean {
    return enabled("FEATURE_AUCTIONS", true);
  },
};
