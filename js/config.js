/**
 * Configuración Central de la Aplicación
 * Única fuente de verdad para endpoints, autenticación y banderas de entorno.
 * NUNCA almacenar secretos, llaves privadas ni credenciales aquí.
 */

export const CONFIG = Object.freeze({
  // URL base de Amazon API Gateway (prod / dev)
  API_BASE_URL: 'https://<tu-api-id>.execute-api.us-east-1.amazonaws.com/prod',

  // Configuración de Amazon Cognito
  COGNITO: {
    USER_POOL_ID: 'us-east-1_XXXXXXXXX',
    CLIENT_ID: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    REGION: 'us-east-1'
  },

  // Parámetros de almacenamiento de sesión local
  AUTH: {
    STORAGE_KEY_TOKEN: 'auth_jwt_token',
    STORAGE_KEY_USER: 'auth_user_data'
  },

  // Tasa de IVA por defecto (16% para CFDI en México)
  IVA_DEFAULT: 0.16,

  // Tiempo límite para peticiones HTTP (ms)
  REQUEST_TIMEOUT_MS: 10000,

  /**
   * MODO DE PRUEBA / MOCK
   * Permite interactuar con la aplicación sin requerir el backend de AWS en vivo.
   * Cambiar a false para enviar peticiones HTTP reales a API Gateway.
   */
  MOCK_MODE: true,

  // Catálogo base de servicios para validación offline de SKUs
  CATALOG_SERVICES: [
    {
      id: 'srv-1',
      servicio: 'Hosting web básico',
      categoria: 'Infraestructura',
      tipo: 'Servicio',
      precioBase: 1200.00,
      skus: ['SRV-HOST-001', 'SRV-HOST-101'],
      sat: {
        claveProdServ: '81112100',
        claveUnidad: 'E48',
        unidadMedida: 'Servicio',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4010-001'
      }
    },
    {
      id: 'srv-2',
      servicio: 'Hosting web avanzado',
      categoria: 'Infraestructura',
      tipo: 'Servicio',
      precioBase: 2400.00,
      skus: ['SRV-HOST-002'],
      sat: {
        claveProdServ: '81112100',
        claveUnidad: 'E48',
        unidadMedida: 'Servicio',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4010-002'
      }
    },
    {
      id: 'srv-3',
      servicio: 'Soporte técnico mensual',
      categoria: 'Soporte',
      tipo: 'Servicio',
      precioBase: 850.00,
      skus: ['SRV-SOP-014'],
      sat: {
        claveProdServ: '81111811',
        claveUnidad: 'E48',
        unidadMedida: 'Servicio',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4020-005'
      }
    },
    {
      id: 'srv-4',
      servicio: 'Registro de dominio',
      categoria: 'Dominios',
      tipo: 'Servicio',
      precioBase: 300.00,
      skus: ['SRV-DOM-003'],
      sat: {
        claveProdServ: '81112105',
        claveUnidad: 'E48',
        unidadMedida: 'Servicio',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4010-003'
      }
    },
    {
      id: 'srv-5',
      servicio: 'Respaldo en la nube',
      categoria: 'Infraestructura',
      tipo: 'Servicio',
      precioBase: 450.00,
      skus: ['SRV-CLOUD-001'],
      sat: {
        claveProdServ: '81112000',
        claveUnidad: 'E48',
        unidadMedida: 'Servicio',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4010-004'
      }
    },
    {
      id: 'srv-6',
      servicio: 'Router empresarial',
      categoria: 'Equipo',
      tipo: 'Producto',
      precioBase: 2100.00,
      skus: ['PRD-ROUT-010'],
      sat: {
        claveProdServ: '43222609',
        claveUnidad: 'H87',
        unidadMedida: 'Pieza',
        objetoImpuesto: 'Sí objeto de impuesto',
        tasaIva: '16%',
        aplicaIeps: 'No',
        retencionIva: 'No',
        retencionIsr: 'No',
        exentoIva: 'No',
        fundamentoFiscal: '—',
        requiereFactura: 'Sí',
        cuentaContable: '4030-010'
      }
    }
  ]
});
