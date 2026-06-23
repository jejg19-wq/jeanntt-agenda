# Jeanntt Agenda 🐾

PWA (app instalable) para que **Ana y Karens** gestionen las citas del grooming móvil
de Jeanntt. HTML + CSS + JavaScript vanilla, **sin frameworks ni build**.

> **Fase 1 (esta):** datos de ejemplo **en memoria** (no se guardan, no usa localStorage).
> **Fase 2:** se conecta al backend poniendo una sola variable (`API_BASE`).

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
1. **Login** con PIN de 4 dígitos.
2. **Agenda**: tira de la semana (marca días bloqueados), lista de citas del día, botón **+** flotante.
3. **Nueva cita**: con precio y duración automáticos al elegir servicio + tamaño.
4. **Bloquear día**: fecha + motivo + lista de días bloqueados.
5. **Detalle de cita**: con **Editar** y **Cancelar**.

---

## ⚙️ Configuración (`js/config.js`)

```js
PIN:      '1234',   // PIN de acceso (PLACEHOLDER — cámbialo por el real)
API_BASE: '',       // vacío = datos de ejemplo. Pon la URL del backend en Fase 2.
SERVICIOS: [ ... ]  // servicios con precio y duración por tamaño
```

- **PIN:** placeholder `1234`. _(Un PIN en el navegador no es seguridad real; en la Fase 2
  el login se valida contra el backend.)_

## 🔌 Conectar el backend (Fase 2)

1. Pon la URL en `config.js`: `API_BASE: 'https://tu-backend.com'`
2. Listo. `api.js` ya trae las llamadas `fetch()` y cambia solo de datos de ejemplo a la red.
   **El token de la agenda va en el backend / variables de entorno, NUNCA en este código** (repo público).

**Contrato REST que espera `api.js`:**

| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| POST | `/auth/login` | `{pin}` | 200 ok / 401 |
| GET | `/appointments?date=YYYY-MM-DD` | — | `[appt]` |
| GET | `/appointments/:id` | — | `appt` |
| POST | `/appointments` | `appt` | `appt` (con id) |
| PUT | `/appointments/:id` | `appt` | `appt` |
| DELETE | `/appointments/:id` | — | ok |
| GET | `/blocks` | — | `[block]` |
| POST | `/blocks` | `{date, motivo}` | `block` (con id) |
| DELETE | `/blocks/:id` | — | ok |

```
appt  = { id, date:'YYYY-MM-DD', time:'HH:MM', cliente, telefono,
          peludo, tamano, servicio, recordatorio:Number, notas }
block = { id, date:'YYYY-MM-DD', motivo }
```

---

## Nota
Tras cambiar archivos, sube `CACHE_VERSION` en `sw.js` (ej. `...-v2`) para que el
service worker sirva la versión nueva.
