/**
 * Utilidades de Formato y Aritmética de Moneda
 * Formato estándar mexicano (MXN) mediante Intl.NumberFormat.
 */

const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Formatea un valor numérico a moneda mexicana (ej. $4,150.00)
 * @param {number | string} amount
 * @returns {string}
 */
export function formatMoney(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) {
    return '$0.00';
  }
  return mxnFormatter.format(num);
}

/**
 * Redondea un número a 2 decimales para evitar errores de coma flotante
 * @param {number} num
 * @returns {number}
 */
export function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
