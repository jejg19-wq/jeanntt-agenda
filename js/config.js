/* ============================================================
   Jeanntt Agenda — configuración
   Variables que se ajustan sin tocar la lógica de la app.
   ============================================================ */

window.CONFIG = {

  /* ---- Acceso ----
     PIN de respaldo SOLO para el modo demo (cuando API_BASE está
     vacío). Con el backend conectado el login se valida contra
     POST /api/agenda/login y este valor se ignora. */
  PIN: '1234',

  /* ---- Backend (Fase 2 — CONECTADO) ----
     URL base del backend real. api.js arma las rutas /api/... sobre
     esta base. Si la dejas vacía, la app vuelve al modo demo (sin
     datos de ejemplo: listas vacías). */
  API_BASE: 'https://jeanntt-backend.onrender.com',

  /* Prefijo del header Authorization. El estándar es 'Bearer '.
     Si el backend espera el token "pelado" (sin prefijo), pon ''. */
  AUTH_PREFIX: 'Bearer ',

  /* ---- ¿Quién eres? ----
     Personas que pueden agendar. Lo elegido se manda como
     `creado_por` al crear una cita y se muestra en el detalle.
     También sirve para detectar citas MANUALES (las que agendó
     el staff) frente a las reservas que entran por la web. */
  USUARIOS: ['Ana', 'Karens'],

  /* ---- Buscador ----
     Rango (en días) que consulta el buscador alrededor de HOY.
     Incluye fechas pasadas para ver el historial. */
  BUSQUEDA_DIAS: { atras: 540, adelante: 365 },

  /* ---- Catálogo de servicios ----
     Precio (USD) y duración (min) por servicio y tamaño. */
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
