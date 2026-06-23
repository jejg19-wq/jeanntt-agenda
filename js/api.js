/* ============================================================
   Jeanntt Agenda — capa de datos (API)
   ------------------------------------------------------------
   Conectada al backend real (CONFIG.API_BASE). El token del
   login se guarda SOLO en memoria (variable _token, nunca en
   localStorage) y viaja en el header Authorization.

   Contrato REST del backend (Fase 2):
     POST   /api/agenda/login        body {pin}          -> { token } / 401
     GET    /api/citas?from&to                            -> [cita]
     POST   /api/citas               body cita            -> cita (con id)
     PATCH  /api/citas/:id           body cita            -> cita
     PATCH  /api/citas/:id/cancelar                       -> ok   (solo manuales)
     GET    /api/bloqueos                                 -> [bloqueo]
     POST   /api/bloqueos            body {fecha,motivo}  -> bloqueo (con id)
     DELETE /api/bloqueos/:id                             -> ok

   ──────────────────────────────────────────────────────────
   👉 MAPEO DE CAMPOS centralizado en el objeto `MAP` (más abajo).
      Si el backend usa otros nombres (p. ej. "mascota" en vez de
      "peludo", o "dia" en vez de "fecha"), AJÚSTALO ahí en un solo
      sitio. La lectura ya es tolerante a varios alias.
   ──────────────────────────────────────────────────────────

   Modelo interno (lo que usa la UI en app.js):
     cita  = { id, date:'YYYY-MM-DD', time:'HH:MM', cliente, telefono,
               peludo, tamano, servicio, recordatorio:Number, notas,
               creado_por, precio:Number|null, estado, origen }
     block = { id, date:'YYYY-MM-DD', motivo }
   ============================================================ */

window.JeannttApi = (function () {
  var CFG = window.CONFIG;

  /* ---------- utilidades de fecha (hora local, sin desfases UTC) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayISO() { return toISO(new Date()); }
  function addDaysISO(iso, n) { var d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function mondayISO(iso) { var d = fromISO(iso); var dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return toISO(d); }
  function addMonthsISO(iso, n) { var p = iso.split('-'); var d = new Date(+p[0], (+p[1] - 1) + n, 1); return toISO(d); }
  function firstOfMonthISO(iso) { var p = iso.split('-'); return p[0] + '-' + p[1] + '-01'; }

  /* ---------- helpers internos ---------- */
  function delay(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms == null ? 90 : ms); }); }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function safeJSON(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }
  function norm(s) { s = String(s == null ? '' : s).toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }

  // primer valor presente (no null/''/undefined) entre una lista de posibles claves
  function pick(o, keys) { if (!o) return undefined; for (var i = 0; i < keys.length; i++) { var v = o[keys[i]]; if (v != null && v !== '') return v; } return undefined; }
  function toInt(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d == null ? 0 : d) : n; }
  function toNum(v) { if (v == null || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
  // normaliza una fecha (acepta 'YYYY-MM-DD' o ISO datetime) a 'YYYY-MM-DD' sin tocar la zona horaria
  function normDate(v) { if (v == null) return ''; var m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/); return m ? (m[1] + '-' + m[2] + '-' + m[3]) : String(v); }
  // normaliza una hora a 'HH:MM'
  function normTime(v) { if (v == null) return ''; var m = String(v).match(/(\d{1,2}):(\d{2})/); return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : ''; }
  // 'HH:MM' (24h) -> '8:00 AM'
  function to12label(t) { if (!t) return ''; var p = String(t).split(':'), hh = parseInt(p[0], 10); if (isNaN(hh)) return ''; var ap = hh >= 12 ? 'PM' : 'AM', h = hh % 12; if (h === 0) h = 12; return h + ':' + (p[1] || '00') + ' ' + ap; }
  // '8:05 am' / '08:05' / '14:05' / '8.05pm' -> 'HH:MM' (24h) | null
  function parseTime(s) {
    s = String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    var m = s.match(/^(\d{1,2})[:.h]?(\d{2})?(am|pm|a|p)?$/);
    if (!m) return null;
    var hh = parseInt(m[1], 10), mm = m[2] ? parseInt(m[2], 10) : 0, ap = m[3];
    if (ap) { if (/p/.test(ap) && hh < 12) hh += 12; if (/a/.test(ap) && hh === 12) hh = 0; }
    if (hh > 23 || mm > 59) return null;
    return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2);
  }

  // desempaqueta respuestas envueltas tipo {cita:{...}} o {data:{...}}
  function unwrap(d) { if (d && typeof d === 'object' && !Array.isArray(d)) return d.cita || d.bloqueo || d.data || d.item || d.result || d; return d; }
  // extrae el array aunque venga envuelto en {citas:[...]}, {data:[...]}, etc.
  function asArray(d) {
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') { var k = ['citas', 'bloqueos', 'data', 'items', 'results', 'rows']; for (var i = 0; i < k.length; i++) if (Array.isArray(d[k[i]])) return d[k[i]]; }
    return [];
  }

  /* ============================================================
     🔧 MAPEO DE CAMPOS  — el ÚNICO sitio que tocar si el backend
        usa otros nombres. `…From` = backend→UI (tolerante a alias).
        `…To` = UI→backend (lo que se envía al guardar).
     ============================================================ */
  var MAP = {
    citaFrom: function (r) {
      if (!r) return null;
      // el backend manda la fecha+hora en `inicio` ("YYYY-MM-DDTHH:MM"); de ahí derivamos date y time
      var inicio = pick(r, ['inicio', 'start', 'fecha_hora', 'fechaHora', 'datetime']);
      return {
        id:           pick(r, ['id', '_id', 'cita_id', 'uuid']),
        date:         normDate(pick(r, ['fecha', 'date', 'dia', 'fecha_cita']) || inicio),
        time:         normTime(pick(r, ['hora_24', 'hora', 'time', 'hora_cita']) || inicio) || parseTime(pick(r, ['hora_label', 'horaLabel'])) || '',
        cliente:      pick(r, ['cliente_nombre', 'cliente', 'nombre_cliente', 'clienta', 'nombre', 'client']) || '',
        telefono:     pick(r, ['telefono', 'teléfono', 'cliente_telefono', 'tel', 'celular', 'phone', 'whatsapp']) || '',
        peludo:       pick(r, ['perro_nombre', 'peludo', 'mascota', 'perro', 'perrito', 'nombre_mascota', 'pet']) || '',
        tamano:       pick(r, ['perro_tamano', 'perro_tamaño', 'tamano', 'tamaño', 'size', 'talla']) || '',
        servicio:     pick(r, ['servicio', 'service', 'tipo_servicio']) || '',
        duracion:     toNum(pick(r, ['duracion_min', 'duracion', 'duration', 'duracionMin'])),
        recordatorio: toInt(pick(r, ['recordatorio', 'reminder', 'aviso']), 10),
        notas:        pick(r, ['notas', 'nota', 'notes', 'observaciones', 'comentario']) || '',
        creado_por:   pick(r, ['creado_por', 'creadoPor', 'created_by', 'agendo', 'agendado_por', 'autor']) || '',
        precio:       toNum(pick(r, ['precio', 'price', 'total', 'monto', 'importe'])),
        estado:       String(pick(r, ['estado', 'status', 'state']) || '').toLowerCase(),
        origen:       String(pick(r, ['origen', 'source', 'canal', 'via', 'medio']) || '').toLowerCase(),
        _raw:         r
      };
    },
    // Lo que se ENVÍA al crear/editar. Nombres EXACTOS del backend.
    citaTo: function (m) {
      var inicio = (m.date && m.time) ? (m.date + 'T' + m.time) : (m.date || '');
      return {
        inicio:         inicio,                 // "YYYY-MM-DDTHH:MM" (canónico para el backend)
        fecha:          m.date,
        hora_label:     to12label(m.time),      // "8:00 AM"
        duracion_min:   m.duracion,
        cliente_nombre: m.cliente,
        perro_nombre:   m.peludo,
        perro_tamano:   m.tamano,
        servicio:       m.servicio,
        precio:         m.precio,
        creado_por:     m.creado_por,
        notas:          m.notas,
        estado:         m.estado || 'confirmada',
        // extras best-effort: el backend los ignora si no los usa. Si el POST fallara por
        // campos desconocidos, basta con quitarlos de aquí.
        telefono:       m.telefono,
        recordatorio:   m.recordatorio
      };
    },
    blockFrom: function (r) {
      if (!r) return null;
      return {
        id:     pick(r, ['id', '_id', 'bloqueo_id', 'uuid']),
        date:   normDate(pick(r, ['fecha', 'date', 'dia'])),
        motivo: pick(r, ['motivo', 'reason', 'nota', 'descripcion']) || 'Bloqueado',
        _raw:   r
      };
    },
    blockTo: function (m) { return { fecha: m.date, motivo: m.motivo }; }
  };

  /* ---------- catálogo / precios ---------- */
  function findServicio(nombre) {
    for (var i = 0; i < CFG.SERVICIOS.length; i++) if (CFG.SERVICIOS[i].nombre === nombre) return CFG.SERVICIOS[i];
    return null;
  }
  function precio(nombre, tamano) { var s = findServicio(nombre); return s && s.precios[tamano] != null ? s.precios[tamano] : null; }
  function duracion(nombre, tamano) { var s = findServicio(nombre); return s && s.duraciones[tamano] != null ? s.duraciones[tamano] : null; }

  // precio efectivo de una cita: el guardado en el backend, o el del catálogo
  function precioDeCita(a) { if (!a) return 0; if (a.precio != null) return a.precio; var p = precio(a.servicio, a.tamano); return p || 0; }

  // ¿la cita la agendó el staff (MANUAL) o entró por la web?  -> Editar/Cancelar solo para manuales.
  function esManual(a) {
    if (!a) return false;
    var o = a.origen || '';
    if (/manual|app|agenda|interno|staff|movil|móvil/.test(o)) return true;
    if (/web|online|cliente|reserva|public/.test(o)) return false;
    // Sin 'origen' fiable: es manual si quien la agendó es del staff.
    var staff = (CFG.USUARIOS || []).map(norm);
    if (a.creado_por && staff.indexOf(norm(a.creado_por)) !== -1) return true;
    return false; // por defecto se trata como reserva web (no editable). Ajusta si hace falta.
  }
  function esCancelada(a) { return !!a && /cancel|anul/.test(a.estado || ''); }
  // cuenta para el total de $ cobrado: confirmada (o sin estado), nunca cancelada/pendiente
  function esConfirmada(a) {
    if (!a) return false;
    var e = a.estado || '';
    if (/cancel|anul/.test(e)) return false;
    if (/pend|espera|rechaz|no_show|noshow|ausent/.test(e)) return false;
    return true;
  }

  /* ---------- token (SOLO en memoria) ---------- */
  var _token = null;
  function setToken(t) { _token = t || null; }
  function authHeaders(withBody) {
    var h = {};
    if (withBody) h['Content-Type'] = 'application/json';
    if (_token) h['Authorization'] = (CFG.AUTH_PREFIX != null ? CFG.AUTH_PREFIX : 'Bearer ') + _token;
    return h;
  }

  /* ---------- wrapper fetch con manejo de errores ---------- */
  function api(method, path, body) {
    var opts = { method: method, headers: authHeaders(body != null) };
    if (body != null) opts.body = JSON.stringify(body);
    return fetch(CFG.API_BASE + path, opts).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) {
          // Loguea el error EXACTO del backend (cuerpo incluido) para diagnosticar.
          console.error('[Jeanntt] ' + method + ' ' + path + ' ->', res.status, t);
          if (body != null) console.error('[Jeanntt] body enviado:', opts.body);
          var err = new Error('HTTP ' + res.status + ' en ' + method + ' ' + path + (t ? ' — ' + t.slice(0, 400) : ''));
          err.status = res.status; err.body = t;
          throw err;
        }
        return safeJSON(t);
      });
    });
  }

  function extractToken(data, raw) {
    if (data && typeof data === 'object') {
      return data.token || data.access_token || data.accessToken || data.jwt || data.id_token || data.auth ||
        (data.data && (data.data.token || data.data.access_token)) || null;
    }
    if (typeof data === 'string' && data) return data;
    if (typeof raw === 'string') { var t = raw.trim().replace(/^"|"$/g, ''); if (t && t.indexOf(' ') === -1 && t.length >= 8) return t; }
    return null;
  }

  /* ============================================================
     API pública — todo devuelve Promesas
     ============================================================ */
  return {

    /* utilidades de fecha que reutiliza la UI */
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    mondayISO: mondayISO,
    addMonthsISO: addMonthsISO,
    firstOfMonthISO: firstOfMonthISO,

    /* catálogo */
    servicios: function () { return CFG.SERVICIOS.map(function (s) { return { nombre: s.nombre }; }); },
    tamanos: function () { return CFG.TAMANOS.slice(); },
    recordatorios: function () { return CFG.RECORDATORIOS.slice(); },
    usuarios: function () { return (CFG.USUARIOS || []).slice(); },
    precio: precio,
    duracion: duracion,
    precioDeCita: precioDeCita,
    esManual: esManual,
    esCancelada: esCancelada,
    esConfirmada: esConfirmada,
    to12label: to12label,
    parseTime: parseTime,
    norm: norm,
    hasToken: function () { return !!_token; },
    logout: function () { setToken(null); },

    /* ---- acceso ----
       Llama POST /api/agenda/login {pin}. Si el PIN es correcto guarda
       el token en memoria y resuelve true; si no, resuelve false
       (la UI muestra "PIN incorrecto" sin más pistas). */
    login: function (pin) {
      if (!CFG.API_BASE) return delay(String(pin) === String(CFG.PIN)); // modo demo
      return fetch(CFG.API_BASE + '/api/agenda/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin })
      }).then(function (res) {
        return res.text().then(function (raw) {
          if (!res.ok) return false; // 401 -> PIN incorrecto
          var data = safeJSON(raw);
          var tok = extractToken(data, raw) ||
            res.headers.get('Authorization') || res.headers.get('authorization') || res.headers.get('x-auth-token');
          if (tok) { setToken(String(tok).replace(/^Bearer\s+/i, '')); return true; }
          if (data && data.ok === false) return false;
          // Respondió 200 pero no encontramos token: dejamos entrar y avisamos en consola.
          console.warn('[Jeanntt] Login OK pero no se detectó token en la respuesta. Revisa el nombre del campo en extractToken().');
          setToken((data && data.token) || '');
          return true;
        });
      }).catch(function (e) { console.error('[Jeanntt] Error de login:', e); return false; });
    },

    /* ---- citas ---- */
    // Carga un RANGO de fechas (semana, mes o búsqueda amplia con pasadas).
    listAppointmentsRange: function (fromISO, toISO2) {
      if (!CFG.API_BASE) return delay([]); // demo: sin datos de ejemplo
      // +1 día en `to`: cubre las citas del último día aunque el backend filtre por datetime (inicio)
      var toQ = addDaysISO(toISO2, 1);
      return api('GET', '/api/citas?from=' + encodeURIComponent(fromISO) + '&to=' + encodeURIComponent(toQ))
        .then(function (d) { return asArray(d).map(MAP.citaFrom); });
    },

    createAppointment: function (model) {
      if (!CFG.API_BASE) return delay(Object.assign({ id: uid('a') }, model));
      return api('POST', '/api/citas', MAP.citaTo(model)).then(function (d) { return MAP.citaFrom(unwrap(d) || model); });
    },

    updateAppointment: function (id, model) {
      if (!CFG.API_BASE) return delay(Object.assign({ id: id }, model));
      return api('PATCH', '/api/citas/' + encodeURIComponent(id), MAP.citaTo(model)).then(function (d) { return MAP.citaFrom(unwrap(d) || model); });
    },

    // Cancela (soft) — solo citas manuales. Usa PATCH /api/citas/:id/cancelar.
    cancelAppointment: function (id) {
      if (!CFG.API_BASE) return delay({ ok: true });
      return api('PATCH', '/api/citas/' + encodeURIComponent(id) + '/cancelar', {}).then(function () { return { ok: true }; });
    },

    /* ---- bloqueos ---- */
    listBlocks: function () {
      if (!CFG.API_BASE) return delay([]);
      return api('GET', '/api/bloqueos').then(function (d) { return asArray(d).map(MAP.blockFrom); });
    },

    createBlock: function (model) {
      if (!CFG.API_BASE) return delay(Object.assign({ id: uid('b') }, model));
      return api('POST', '/api/bloqueos', MAP.blockTo(model)).then(function (d) { return MAP.blockFrom(unwrap(d) || model); });
    },

    deleteBlock: function (id) {
      if (!CFG.API_BASE) return delay({ ok: true });
      return api('DELETE', '/api/bloqueos/' + encodeURIComponent(id)).then(function () { return { ok: true }; });
    }
  };
})();
