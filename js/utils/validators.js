/**
 * Utilidades de Validación de Datos
 * Reglas de negocio y especificaciones de formato SAT y Pydantic v2.
 */

// Expresión regular estándar para correo electrónico
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Expresión regular SAT para RFC (12 caracteres Moral, 13 caracteres Física)
const RFC_SAT_REGEX = /^[A-Z&Ñ]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

// SKU / id_service: alfanumérico, guiones y guion bajo, 3 a 30 caracteres
const SKU_REGEX = /^[A-Z0-9_-]{3,30}$/;

// Código postal mexicano: exactamente 5 dígitos
const CP_REGEX = /^\d{5}$/;

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
 * Valida razón social del receptor (3 a 200 caracteres)
 * @param {string} razonSocial
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateRazonSocial(razonSocial) {
  const clean = typeof razonSocial === 'string' ? razonSocial.trim() : '';
  if (!clean) {
    return { isValid: false, message: 'La razón social es obligatoria.' };
  }
  if (clean.length < 3 || clean.length > 200) {
    return { isValid: false, message: 'La razón social debe tener entre 3 y 200 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Valida código postal fiscal (5 dígitos)
 * @param {string} cp
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateCodigoPostal(cp) {
  const clean = typeof cp === 'string' ? cp.trim() : '';
  if (!clean) {
    return { isValid: false, message: 'El código postal es obligatorio.' };
  }
  if (!CP_REGEX.test(clean)) {
    return { isValid: false, message: 'El código postal debe tener exactamente 5 dígitos numéricos.' };
  }
  return { isValid: true };
}

/**
 * Valida dirección fiscal (5 a 255 caracteres)
 * @param {string} direccion
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateDireccion(direccion) {
  const clean = typeof direccion === 'string' ? direccion.trim() : '';
  if (!clean) {
    return { isValid: false, message: 'La dirección fiscal es obligatoria.' };
  }
  if (clean.length < 5 || clean.length > 255) {
    return { isValid: false, message: 'La dirección debe tener entre 5 y 255 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Valida un código SKU / id_service
 * @param {string} sku
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateSKU(sku) {
  if (!sku || typeof sku !== 'string') {
    return { isValid: false, message: 'Selecciona un servicio del catálogo.' };
  }
  const cleanSku = sku.trim().toUpperCase();
  if (cleanSku.length === 0) {
    return { isValid: false, message: 'Selecciona un servicio del catálogo.' };
  }
  if (!SKU_REGEX.test(cleanSku)) {
    return { isValid: false, message: 'El SKU del servicio no tiene un formato válido.' };
  }
  return { isValid: true };
}
