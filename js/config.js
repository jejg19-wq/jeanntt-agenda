/* ============================================================
   Jeanntt Agenda — configuración
   Variables que se ajustan sin tocar la lógica de la app.
   ============================================================ */

window.CONFIG = {

  /* ---- Acceso ----
     PIN de 4 dígitos para entrar. Es un PLACEHOLDER de la Fase 1.
     Cámbialo por el real cuando lo definan Ana y Karens.
     OJO: un PIN en el navegador no es seguridad real; en la Fase 2
     el login se valida contra el backend (ver api.js → login()). */
  PIN: '1234',

  /* ---- Backend (Fase 2) ----
     Cuando el backend esté listo, pon aquí su URL base
     (ej: 'https://api.jeanntt.com'). Mientras esté vacío,
     la app funciona con datos de ejemplo en memoria.
     api.js detecta esto y cambia solo a llamadas reales. */
  API_BASE: '',

  /* ---- Catálogo de servicios ----
     Precio (USD) y duración (min) por servicio y tamaño.
     En la Fase 2 esto puede venir del backend (api.listServices). */
  SERVICIOS: [
    {
      nombre: 'Baño Básico',
      precios:    { 'Pequeño': 60, 'Mediano': 80,  'Grande': 100, 'XL': 120 },
      duraciones: { 'Pequeño': 40, 'Mediano': 50,  'Grande': 60,  'XL': 70  }
    },
    {
      nombre: 'Baño Full',
      precios:    { 'Pequeño': 80, 'Mediano': 100, 'Grande': 120, 'XL': 150 },
      duraciones: { 'Pequeño': 70, 'Mediano': 90,  'Grande': 110, 'XL': 130 }
    },
    {
      nombre: 'Spa Premium',
      precios:    { 'Pequeño': 100,'Mediano': 120, 'Grande': 150, 'XL': 200 },
      duraciones: { 'Pequeño': 90, 'Mediano': 110, 'Grande': 140, 'XL': 170 }
    },
    {
      nombre: 'Solo baño y secado',
      precios:    { 'Pequeño': 35, 'Mediano': 45,  'Grande': 55,  'XL': 65  },
      duraciones: { 'Pequeño': 30, 'Mediano': 35,  'Grande': 45,  'XL': 55  }
    }
  ],

  /* Tamaños disponibles (chips del formulario) */
  TAMANOS: ['Pequeño', 'Mediano', 'Grande', 'XL'],

  /* Opciones de recordatorio en minutos (chips del formulario) */
  RECORDATORIOS: [10, 20, 30]
};
