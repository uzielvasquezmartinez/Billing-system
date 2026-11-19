/**
 * Configuración Central de la Aplicación
 * Única fuente de verdad para endpoints, autenticación y banderas de entorno.
 * NUNCA almacenar secretos, llaves privadas ni credenciales aquí.
 */

const rawApiBaseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:5001';

export const CONFIG = Object.freeze({
  // URL base de la API REST (inyectada desde .env.development / .env.production)
  API_BASE_URL: rawApiBaseUrl.replace(/\/+$/, ''),

  // Configuración de Amazon Cognito (referencia pública sin secretos)
  COGNITO: {
    USER_POOL_ID: 'us-east-1_fWBs2LMa3',
    CLIENT_ID: '1dhc6l396sgg79cl4qbn8shqn2',
    REGION: 'us-east-1'
  },

  // Parámetros de almacenamiento de sesión local
  AUTH: {
    STORAGE_KEY_TOKEN: 'auth_jwt_token',
    STORAGE_KEY_USER: 'auth_user_data'
  },

  // Tasa de IVA por defecto (16% para CFDI en México)
  IVA_DEFAULT: 0.16,

  // Tiempos límite para peticiones HTTP (ms)
  REQUEST_TIMEOUT_MS: 30000,
  INVOICE_MUTATION_TIMEOUT_MS: 45000,

  /**
   * MODO DE PRUEBA / MOCK
   * Deshabilitado permanentemente para operar contra la API real.
   */
  MOCK_MODE: false
});
