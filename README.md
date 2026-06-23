# Jeanntt Agenda 🐾

PWA (app instalable) para que **Ana, Karens y Jackson** gestionen las citas del grooming
móvil de Jeanntt. HTML + CSS + JavaScript vanilla, **sin frameworks ni build**.

> **Conectada al backend real** (`API_BASE = https://jeanntt-backend.onrender.com`).
> El token del login se guarda **solo en memoria** (nunca en localStorage); al recargar
> se vuelve a pedir el PIN. Sin datos de ejemplo.

---

## URL para instalar

Publicado con GitHub Pages (rama por defecto, carpeta raíz `/`):

```
https://jejg19-wq.github.io/jeanntt-agenda/
```

### Instalar en el iPhone (icono en pantalla de inicio)
1. Abre la URL en **Safari**.
2. Toca **Compartir** → **Agregar a inicio**.
3. Aparece el icono de la van rosa. Ábrelo: corre a pantalla completa.

En Android/Chrome aparece directamente **«Instalar app»**.

---

## Estructura (la app es la raíz del repo)

```
.
├── index.html              cascarón de la app (todas las pantallas)
├── manifest.json           manifiesto PWA
├── sw.js                   service worker (carga instantánea + offline)
├── .nojekyll               sirve sw.js/manifest.json tal cual en Pages
├── css/
│   └── styles.css          diseño 1:1 del prototipo + safe-area iPhone
├── js/
│   ├── config.js           ⚙️ PIN, API_BASE y catálogo de servicios
│   ├── api.js              capa de datos: en memoria hoy, fetch() listo para Fase 2
│   └── app.js              lógica de UI
└── icons/                  iconos PWA (van rosa sobre el morado de marca)
```

## Pantallas
1. **Login** con PIN de 4 dígitos (validado contra el backend).
2. **¿Quién eres?** (Ana / Karens / Jackson): se guarda como `creado_por` en cada cita.
3. **Agenda**: encabezado con navegación ‹ ›, botón **Semana/Mes**, tira de la semana o
   **calendario mensual** (marca días con citas y bloqueados), **totales de $** del día y
   de la semana, lista de citas del día y botón **+** flotante.
4. **Nueva cita**: con precio y duración automáticos al elegir servicio + tamaño. Desde un
   día del mes se agenda con semanas de anticipación.
5. **Bloquear día**: fecha + motivo + lista de días bloqueados.
6. **Detalle de cita**: muestra quién la **agendó**, botones **WhatsApp** y **Llamar** (si
   hay teléfono), y **Editar/Cancelar** solo en citas manuales (no en reservas web).
7. **Buscar**: por nombre del peludo o del cliente en todo el historial (incluye pasadas).
8. **Avisos push**: tras elegir persona, la agenda muestra **🔔 Activar avisos de citas**.
   Pide permiso, se suscribe y registra el dispositivo en el backend con la persona elegida.
   El robot manda el aviso 10/20/30 min antes de cada cita. En iPhone **debe estar instalada
   en inicio** (Compartir → Agregar a inicio); si no lo está, la app lo explica.

---

## ⚙️ Configuración (`js/config.js`)

```js
API_BASE:    'https://jeanntt-backend.onrender.com', // backend real
AUTH_PREFIX: 'Bearer ',          // header Authorization ('' si el token va "pelado")
USUARIOS:    ['Ana','Karens','Jackson'],   // pantalla "¿Quién eres?" + creado_por
BUSQUEDA_DIAS: { atras: 540, adelante: 365 }, // rango del buscador (incluye pasadas)
PIN:         '1234',             // solo se usa en modo demo (API_BASE vacío)
SERVICIOS:   [ ... ]             // servicios con precio y duración por tamaño
```

## 🔌 Backend (conectado)

El login llama `POST /api/agenda/login {pin}`; el **token** devuelto se guarda en una
variable JS (**memoria, nunca localStorage**) y viaja en `Authorization` en el resto de
llamadas. Si el PIN es incorrecto, la app muestra «PIN incorrecto» sin más pistas.

**Contrato REST:**

| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| POST  | `/api/agenda/login` | `{pin}` | `{token}` / 401 |
| GET   | `/api/citas?from=YYYY-MM-DD&to=YYYY-MM-DD` | — | `[cita]` |
| POST  | `/api/citas` | `cita` (con `creado_por`) | `cita` (con id) |
| PATCH | `/api/citas/:id` | `cita` | `cita` |
| PATCH | `/api/citas/:id/cancelar` | — | ok _(solo manuales)_ |
| GET   | `/api/bloqueos` | — | `[bloqueo]` |
| POST  | `/api/bloqueos` | `{fecha, motivo}` | `bloqueo` (con id) |
| DELETE| `/api/bloqueos/:id` | — | ok |
| GET   | `/api/push/public-key` | — | llave pública VAPID |
| POST  | `/api/push/subscribe` | `{subscription, persona}` | ok _(con `Authorization`)_ |

```
cita    = { id, inicio:'YYYY-MM-DDTHH:MM', fecha:'YYYY-MM-DD', hora_label:'8:00 AM',
            duracion_min:Number, cliente_nombre, perro_nombre, perro_tamano, servicio,
            precio, creado_por, notas, estado }
bloqueo = { id, fecha:'YYYY-MM-DD', motivo }
```

El front deriva `date`/`time` de `inicio`; al crear/editar envía `inicio` ("YYYY-MM-DDTHH:MM")
más esos mismos campos. `telefono` y `recordatorio` se mandan como extras best-effort.

> 🔧 **Si el backend usa otros nombres de campo** (p. ej. `mascota` en vez de `peludo`, o
> `dia` en vez de `fecha`), se ajustan en **un solo sitio**: el objeto `MAP` al inicio de
> `js/api.js` (`citaFrom`/`citaTo`, `blockFrom`/`blockTo`). La lectura ya es tolerante a
> varios alias comunes. El detalle de citas usa la caché en memoria (no hay `GET /:id`).

> ⚠️ **CORS:** el backend debe permitir el origen de la PWA
> (`https://jejg19-wq.github.io`) en `Access-Control-Allow-Origin`, además de los métodos
> `GET, POST, PATCH, DELETE` y el header `Authorization`. Si una llamada falla por origen,
> es esto.

---

## Nota
Tras cambiar archivos del cascarón, sube `CACHE_VERSION` en `sw.js` (ej. `...-v3`) para que
el service worker sirva la versión nueva.
