/* ============================================================
   Jeanntt Agenda — capa de datos (API)
   ------------------------------------------------------------
   FASE 1 (ahora): datos de ejemplo EN MEMORIA. No usa
   localStorage; al recargar vuelve a la semilla.
   FASE 2 (luego): pon CONFIG.API_BASE y cada método llama al
   backend con fetch(). La interfaz NO cambia, así que la UI
   (app.js) sigue igual.

   Contrato REST que espera la Fase 2:
     POST   {API_BASE}/auth/login        body {pin}            -> 200 ok / 401
     GET    {API_BASE}/appointments?date=YYYY-MM-DD            -> [appt]
     GET    {API_BASE}/appointments/:id                        -> appt
     POST   {API_BASE}/appointments      body appt             -> appt (con id)
     PUT    {API_BASE}/appointments/:id  body appt             -> appt
     DELETE {API_BASE}/appointments/:id                        -> ok
     GET    {API_BASE}/blocks                                  -> [block]
     POST   {API_BASE}/blocks            body {date,motivo}    -> block (con id)
     DELETE {API_BASE}/blocks/:id                              -> ok

   Modelos:
     appt  = { id, date:'YYYY-MM-DD', time:'HH:MM'(24h), cliente,
               telefono, peludo, tamano, servicio, recordatorio:Number, notas }
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

  /* ---------- helpers internos ---------- */
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function delay(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms == null ? 110 : ms); }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jsonHeaders() { return { 'Content-Type': 'application/json' }; }

  /* ---------- catálogo / precios ---------- */
  function findServicio(nombre) {
    for (var i = 0; i < CFG.SERVICIOS.length; i++) if (CFG.SERVICIOS[i].nombre === nombre) return CFG.SERVICIOS[i];
    return null;
  }
  function precio(nombre, tamano) { var s = findServicio(nombre); return s && s.precios[tamano] != null ? s.precios[tamano] : null; }
  function duracion(nombre, tamano) { var s = findServicio(nombre); return s && s.duraciones[tamano] != null ? s.duraciones[tamano] : null; }

  /* ---------- semilla en memoria (relativa a HOY para que siempre haya datos) ---------- */
  var _appts = [];
  var _blocks = [];

  function seed() {
    var hoy = todayISO();
    _appts = [
      { id: uid('a'), date: hoy, time: '09:00', cliente: 'María G.', telefono: '615 000 111', peludo: 'Kiara', tamano: 'Pequeño', servicio: 'Baño Full',    recordatorio: 10, notas: 'Shih Tzu — consentida, tocar timbre' },
      { id: uid('a'), date: hoy, time: '11:30', cliente: 'Ana P.',   telefono: '615 000 222', peludo: 'Max',   tamano: 'Mediano', servicio: 'Spa Premium',  recordatorio: 20, notas: 'Schnauzer — deshedding' },
      { id: uid('a'), date: hoy, time: '14:00', cliente: 'Carlos R.', telefono: '',            peludo: 'Luna',  tamano: 'Pequeño', servicio: 'Baño Básico',  recordatorio: 10, notas: '' }
    ];
    // Bloquea un par de días de ESTA semana (nunca hoy, para que hoy muestre sus citas).
    var lun = mondayISO(hoy);
    var motivos = { 1: 'Agenda llena', 3: 'Mantenimiento de la van', 5: 'Agenda llena' };
    _blocks = [];
    [1, 3, 5].forEach(function (off) {
      var d = addDaysISO(lun, off);
      if (d !== hoy) _blocks.push({ id: uid('b'), date: d, motivo: motivos[off] });
    });
  }
  seed();

  /* ============================================================
     API pública — todo devuelve Promesas (igual que con fetch)
     ============================================================ */
  return {

    /* utilidades de fecha que la UI reutiliza */
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    mondayISO: mondayISO,

    /* catálogo */
    servicios: function () { return clone(CFG.SERVICIOS); },
    tamanos: function () { return CFG.TAMANOS.slice(); },
    recordatorios: function () { return CFG.RECORDATORIOS.slice(); },
    precio: precio,
    duracion: duracion,

    /* ---- acceso ---- */
    login: function (pin) {
      if (CFG.API_BASE) {
        return fetch(CFG.API_BASE + '/auth/login', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ pin: pin }) })
          .then(function (r) { return r.ok; });
      }
      return delay(String(pin) === String(CFG.PIN));
    },

    /* ---- citas ---- */
    listAppointments: function (dateISO) {
      if (CFG.API_BASE) {
        return fetch(CFG.API_BASE + '/appointments?date=' + encodeURIComponent(dateISO)).then(function (r) { return r.json(); });
      }
      var list = _appts.filter(function (a) { return a.date === dateISO; })
        .sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
      return delay(clone(list));
    },

    getAppointment: function (id) {
      if (CFG.API_BASE) return fetch(CFG.API_BASE + '/appointments/' + id).then(function (r) { return r.json(); });
      var a = _appts.filter(function (x) { return x.id === id; })[0];
      return delay(a ? clone(a) : null);
    },

    createAppointment: function (data) {
      if (CFG.API_BASE) {
        return fetch(CFG.API_BASE + '/appointments', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) }).then(function (r) { return r.json(); });
      }
      var appt = Object.assign({ id: uid('a') }, data);
      _appts.push(appt);
      return delay(clone(appt));
    },

    updateAppointment: function (id, data) {
      if (CFG.API_BASE) {
        return fetch(CFG.API_BASE + '/appointments/' + id, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) }).then(function (r) { return r.json(); });
      }
      for (var i = 0; i < _appts.length; i++) {
        if (_appts[i].id === id) { _appts[i] = Object.assign({}, _appts[i], data, { id: id }); return delay(clone(_appts[i])); }
      }
      return delay(null);
    },

    cancelAppointment: function (id) {
      if (CFG.API_BASE) return fetch(CFG.API_BASE + '/appointments/' + id, { method: 'DELETE' }).then(function (r) { return { ok: r.ok }; });
      _appts = _appts.filter(function (x) { return x.id !== id; });
      return delay({ ok: true });
    },

    /* ---- bloqueos ---- */
    listBlocks: function () {
      if (CFG.API_BASE) return fetch(CFG.API_BASE + '/blocks').then(function (r) { return r.json(); });
      var list = _blocks.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      return delay(clone(list));
    },

    createBlock: function (data) {
      if (CFG.API_BASE) {
        return fetch(CFG.API_BASE + '/blocks', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) }).then(function (r) { return r.json(); });
      }
      var block = Object.assign({ id: uid('b') }, data);
      _blocks.push(block);
      return delay(clone(block));
    },

    deleteBlock: function (id) {
      if (CFG.API_BASE) return fetch(CFG.API_BASE + '/blocks/' + id, { method: 'DELETE' }).then(function (r) { return { ok: r.ok }; });
      _blocks = _blocks.filter(function (x) { return x.id !== id; });
      return delay({ ok: true });
    }
  };
})();
