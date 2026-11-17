/**
 * Utilidades de Validación de Datos
 * Reglas de negocio y especificaciones de formato.
 */

// Expresión regular estándar para correo electrónico
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Expresión regular SAT para RFC (12 caracteres Moral, 13 caracteres Física)
const RFC_SAT_REGEX = /^[A-Z&Ñ]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

// SKU: alfanumérico, permite guiones, sin espacios, 1 a 30 caracteres
const SKU_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

/**
 * Valida un correo electrónico
 * @param {string} email
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'El correo electrónico es obligatorio.' };
  }
  const cleanEmail = email.trim();
  if (cleanEmail.length === 0) {
    return { isValid: false, message: 'El correo electrónico es obligatorio.' };
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { isValid: false, message: 'Ingresa un formato de correo válido (ejemplo: usuario@dominio.com).' };
  }
  return { isValid: true };
}

/**
 * Valida una contraseña para el formulario de login
 * @param {string} password
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'La contraseña es obligatoria.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Valida un RFC contra la especificación vigente del SAT
 * @param {string} rfc
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateRFC(rfc) {
  if (!rfc || typeof rfc !== 'string') {
    return { isValid: false, message: 'El RFC es obligatorio.' };
  }
  const cleanRFC = rfc.trim().toUpperCase();
  if (cleanRFC.length < 12 || cleanRFC.length > 13) {
    return { isValid: false, message: 'El RFC debe tener exactamente 12 o 13 caracteres.' };
  }
  if (!RFC_SAT_REGEX.test(cleanRFC)) {
    return { isValid: false, message: 'El RFC no cumple con la estructura fiscal válida del SAT.' };
  }
  return { isValid: true };
}

/**
 * Valida un código SKU
 * @param {string} sku
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateSKU(sku) {
  if (!sku || typeof sku !== 'string') {
    return { isValid: false, message: 'El SKU es obligatorio.' };
  }
  const cleanSku = sku.trim();
  if (cleanSku.length === 0) {
    return { isValid: false, message: 'El SKU es obligatorio.' };
  }
  if (!SKU_REGEX.test(cleanSku)) {
    return { isValid: false, message: 'El SKU debe ser alfanumérico sin espacios (máx. 30 caracteres).' };
  }
  return { isValid: true };
}
