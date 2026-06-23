/* ============================================================
   Jeanntt Agenda — lógica de la app (UI)
   Réplica del comportamiento del prototipo, pero con fechas
   reales y leyendo/escribiendo SIEMPRE a través de JeannttApi
   (capa de datos). Cuando el backend esté listo, esta capa no
   cambia: solo se configura CONFIG.API_BASE.
   ============================================================ */
(function () {
  var Api = window.JeannttApi;

  /* ---------- DOM helpers ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- etiquetas de fecha en español ---------- */
  var DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];        // lunes-primero
  var DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function parts(iso) { var p = iso.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dowIdx(iso) { var p = parts(iso); var d = new Date(p.y, p.m - 1, p.d); return (d.getDay() + 6) % 7; }
  function longDate(iso) { var p = parts(iso); return DOW_LONG[dowIdx(iso)] + ' ' + p.d + ' de ' + MES[p.m - 1]; }
  function blkDate(iso) { var p = parts(iso); return DOW_LONG[dowIdx(iso)] + ' ' + p.d + ' de ' + MES[p.m - 1]; }

  /* ---------- hora 24h -> 12h ---------- */
  function to12(t) {
    if (!t) return { h: '—', ap: '' };
    var p = t.split(':'), hh = parseInt(p[0], 10), ap = hh >= 12 ? 'PM' : 'AM', h12 = hh % 12; if (h12 === 0) h12 = 12;
    return { h: h12 + ':' + p[1], ap: ap };
  }

  /* ---------- iconos SVG reutilizados ---------- */
  var SVG = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.5 21a2 2 0 0 1-3 0"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a8 8 0 0 1 15 0"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v5h5"/><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z"/></svg>'
  };

  /* ---------- estado ---------- */
  var state = {
    selected: Api.todayISO(),
    weekStart: Api.mondayISO(Api.todayISO()),
    blocks: [],       // bloqueos actuales (lista completa)
    blockedSet: {},   // 'YYYY-MM-DD' -> true (para marcar la tira de semana)
    editingId: null
  };

  /* ---------- navegación entre pantallas ---------- */
  function show(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    $('#tabbar').style.display = (id === 'login') ? 'none' : 'flex';
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-go') === id); });
    var sc = $('.scroll', $('#' + id)); if (sc) sc.scrollTop = 0;
  }

  /* ============================================================
     LOGIN (PIN)
     ============================================================ */
  var pin = '';
  function renderDots() { $$('.dot').forEach(function (d, i) { d.classList.toggle('f', i < pin.length); }); }
  function pinError() {
    var dots = $('.dots'); dots.classList.add('err');
    setTimeout(function () { dots.classList.remove('err'); pin = ''; renderDots(); }, 420);
  }
  function pressKey(n) {
    if (pin.length >= 4) return;
    pin += n; renderDots();
    if (pin.length === 4) {
      var entered = pin;
      setTimeout(function () {
        Api.login(entered).then(function (ok) {
          if (ok) { pin = ''; renderDots(); enterApp(); }
          else { pinError(); }
        });
      }, 200);
    }
  }

  /* ============================================================
     AGENDA — tira de semana + lista del día
     ============================================================ */
  // Carga los bloqueos UNA vez, actualiza el set para la tira de semana y los devuelve.
  function loadBlocks() {
    return Api.listBlocks().then(function (blocks) {
      state.blocks = blocks;
      state.blockedSet = {};
      blocks.forEach(function (b) { state.blockedSet[b.date] = true; });
      return blocks;
    });
  }

  function renderWeek() {
    var w = $('#week'); w.innerHTML = '';
    var today = Api.todayISO();
    for (var i = 0; i < 7; i++) {
      (function (iso, name) {
        var blocked = !!state.blockedSet[iso];
        var cls = 'day' + (iso === state.selected ? ' sel' : '') + (blocked ? ' blocked' : '') + (iso === today ? ' today' : '');
        var el = document.createElement('div');
        el.className = cls;
        el.innerHTML = '<div class="dn">' + name + '</div><div class="dd">' + parts(iso).d + '</div>';
        el.addEventListener('click', function () { selectDay(iso); });
        w.appendChild(el);
      })(Api.addDaysISO(state.weekStart, i), DOW_SHORT[i]);
    }
  }

  function selectDay(iso) {
    state.selected = iso;
    renderWeek();
    renderList(iso);
  }

  function renderList(iso) {
    var blocked = !!state.blockedSet[iso];
    $('#dt-day').textContent = longDate(iso) + (blocked ? ' — bloqueado' : '');

    if (blocked) {
      $('#dt-count').textContent = '';
      $('#agenda-sub').textContent = 'Día bloqueado';
      $('#list').innerHTML = emptyState('lock', 'Día bloqueado', 'Agenda llena. La web no ofrece este día.');
      return;
    }

    $('#list').innerHTML = '<div class="empty"><p>Cargando…</p></div>';
    Api.listAppointments(iso).then(function (appts) {
      var n = appts.length;
      if (n === 0) {
        $('#dt-count').textContent = 'libre';
        $('#agenda-sub').textContent = 'Sin citas este día';
        $('#list').innerHTML = emptyState('cal', 'Sin citas este día', 'Toca el botón + para agregar la primera.');
        return;
      }
      var first = to12(appts[0].time);
      $('#dt-count').textContent = n + (n === 1 ? ' cita' : ' citas');
      $('#agenda-sub').textContent = n + (n === 1 ? ' cita' : ' citas') + ' · próxima ' + first.h + ' ' + first.ap;
      var l = $('#list'); l.innerHTML = '';
      appts.forEach(function (a) { l.appendChild(apptCard(a)); });
    });
  }

  function emptyState(icon, title, text) {
    return '<div class="empty"><div class="ico">' + SVG[icon] + '</div><b>' + esc(title) + '</b><p>' + esc(text) + '</p></div>';
  }

  function apptCard(a) {
    var t = to12(a.time);
    var el = document.createElement('div');
    el.className = 'appt';
    el.innerHTML =
      '<div class="time"><div class="h">' + esc(t.h) + '</div><div class="ap">' + esc(t.ap) + '</div></div>' +
      '<div class="bar"></div>' +
      '<div class="info"><div class="dog">' + esc(a.peludo || 'Peludo') + ' <span class="sz">' + esc(a.tamano) + '</span></div>' +
      '<div class="svc">' + esc(a.servicio) + '</div>' +
      '<div class="meta"><i>' + SVG.user + esc(a.cliente || '—') + '</i>' +
      '<i>' + SVG.bell + esc(a.recordatorio) + ' min antes</i></div></div>' +
      '<div class="chev">' + SVG.chev + '</div>';
    el.addEventListener('click', function () { openDetail(a.id); });
    return el;
  }

  /* ============================================================
     DETALLE
     ============================================================ */
  function openDetail(id) {
    show('detalle');
    $('#detail-body').innerHTML = '<div class="empty"><p>Cargando…</p></div>';
    Api.getAppointment(id).then(function (a) {
      if (!a) { $('#detail-body').innerHTML = emptyState('cal', 'Cita no encontrada', 'Puede que se haya cancelado.'); return; }
      var t = to12(a.time);
      var precio = Api.precio(a.servicio, a.tamano);
      $('#detail-body').innerHTML =
        '<div class="detailcard"><div class="bigtime">' + esc(t.h) + ' ' + esc(t.ap) + '</div>' +
        '<div class="bigdog">' + esc(a.peludo || 'Peludo') + '</div>' +
        '<div class="bigsvc">' + esc(a.servicio) + ' · ' + esc(a.tamano) + '</div></div>' +
        '<div class="detailcard" style="text-align:left;padding:6px 18px">' +
          dl(SVG.cal, longDate(a.date)) +
          dl(SVG.user, a.cliente || '—') +
          dl(SVG.phone, a.telefono || '—') +
          dl(SVG.bell, a.recordatorio + ' min antes') +
          (precio != null ? dl(SVG.tag, '$' + precio) : '') +
          dl(SVG.note, a.notas || '—') +
        '</div>' +
        '<div class="detailbtns">' +
          '<button class="cta obtn" id="d-edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> Editar</button>' +
          '<button class="cta red" id="d-cancel">' + SVG.trash + ' Cancelar</button>' +
        '</div>';
      $('#d-edit').addEventListener('click', function () { openEdit(id); });
      $('#d-cancel').addEventListener('click', function () {
        Api.cancelAppointment(id).then(function () {
          renderList(state.selected); show('agenda'); toast('Cita cancelada');
        });
      });
    });
  }
  function dl(icon, v) { return '<div class="dl"><span class="dk">' + icon + '</span><span class="dv">' + esc(v) + '</span></div>'; }

  /* ============================================================
     FORMULARIO — nueva / editar cita
     ============================================================ */
  function buildServiceOptions() {
    var sel = $('#f-svc');
    sel.innerHTML = '<option value="">Elige un servicio…</option>';
    Api.servicios().forEach(function (s) {
      var o = document.createElement('option'); o.value = s.nombre; o.textContent = s.nombre; sel.appendChild(o);
    });
  }
  function selVal(sel) { var on = $(sel + ' .chip.on'); return on ? on.getAttribute('data-v') : ''; }
  function setChip(group, value) {
    $$(group + ' .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-v') === String(value)); });
  }
  function updPrice() {
    var svc = $('#f-svc').value, sz = selVal('#f-size');
    var p = Api.precio(svc, sz), d = Api.duracion(svc, sz);
    $('#f-price').textContent = (p != null) ? '$' + p : '—';
    $('#f-dur').textContent = (d != null) ? '~' + d + ' min' : '—';
  }

  function resetForm() {
    $('#f-cli').value = ''; $('#f-tel').value = ''; $('#f-dog').value = '';
    $('#f-svc').value = ''; $('#f-notes').value = '';
    $$('#f-size .chip').forEach(function (x) { x.classList.remove('on'); });
    setChip('#f-rem', 10);
    updPrice();
  }

  function openNew() {
    state.editingId = null;
    $('#nueva-title').textContent = 'Nueva cita';
    $('#save-appt-label').textContent = 'Guardar cita';
    resetForm();
    $('#f-date').value = state.selected;
    $('#f-time').value = '';
    show('nueva');
  }

  function openEdit(id) {
    Api.getAppointment(id).then(function (a) {
      if (!a) return;
      state.editingId = id;
      $('#nueva-title').textContent = 'Editar cita';
      $('#save-appt-label').textContent = 'Guardar cambios';
      $('#f-cli').value = a.cliente || '';
      $('#f-tel').value = a.telefono || '';
      $('#f-dog').value = a.peludo || '';
      $('#f-svc').value = a.servicio || '';
      $('#f-date').value = a.date;
      $('#f-time').value = a.time;
      $('#f-notes').value = a.notas || '';
      setChip('#f-size', a.tamano);
      setChip('#f-rem', a.recordatorio);
      updPrice();
      show('nueva');
    });
  }

  function saveAppt() {
    var payload = {
      cliente: $('#f-cli').value.trim(),
      telefono: $('#f-tel').value.trim(),
      peludo: $('#f-dog').value.trim(),
      tamano: selVal('#f-size'),
      servicio: $('#f-svc').value,
      date: $('#f-date').value,
      time: $('#f-time').value,
      recordatorio: parseInt(selVal('#f-rem') || '10', 10),
      notas: $('#f-notes').value.trim()
    };

    // validación mínima
    var falta =
      !payload.cliente ? 'el nombre del cliente' :
      !payload.peludo ? 'el nombre del peludo' :
      !payload.tamano ? 'el tamaño' :
      !payload.servicio ? 'el servicio' :
      !payload.date ? 'la fecha' :
      !payload.time ? 'la hora' : null;
    if (falta) { toast('Falta ' + falta); return; }

    var op = state.editingId
      ? Api.updateAppointment(state.editingId, payload)
      : Api.createAppointment(payload);

    op.then(function () {
      var editing = state.editingId;
      state.editingId = null;
      // mueve la vista al día de la cita para que se vea el resultado
      state.selected = payload.date;
      state.weekStart = Api.mondayISO(payload.date);
      renderWeek();
      renderList(payload.date);
      show('agenda');
      toast(editing ? 'Cita actualizada ✓' : 'Cita guardada ✓ — bloqueada en la web');
    });
  }

  /* ============================================================
     BLOQUEAR DÍA
     ============================================================ */
  function renderBlockList(blocks) {
    var bl = $('#blocklist');
    if (!blocks.length) { bl.innerHTML = '<div style="font-size:12.5px;color:var(--lav);padding:4px 2px">Ningún día bloqueado.</div>'; return; }
    bl.innerHTML = '';
    blocks.forEach(function (b) {
      var d = document.createElement('div'); d.className = 'blk';
      d.innerHTML =
        '<div class="bi">' + SVG.lock + '</div>' +
        '<div class="bt"><b>' + esc(blkDate(b.date)) + '</b><span>' + esc(b.motivo) + '</span></div>' +
        '<div class="del">' + SVG.trash + '</div>';
      $('.del', d).addEventListener('click', function () { removeBlock(b); });
      bl.appendChild(d);
    });
  }

  function openBlockScreen() {
    $('#blocklist').innerHTML = '<div style="font-size:12.5px;color:var(--lav);padding:4px 2px">Cargando…</div>';
    show('bloquear');
    loadBlocks().then(renderBlockList);
  }

  function removeBlock(b) {
    Api.deleteBlock(b.id).then(function () {
      loadBlocks().then(function (blocks) {
        renderBlockList(blocks); renderWeek();
        if (state.selected === b.date) renderList(state.selected);
        toast('Día desbloqueado');
      });
    });
  }

  function saveBlock() {
    var date = $('#b-date').value;
    if (!date) { toast('Elige una fecha primero'); return; }
    var motivo = $('#b-reason').value.trim() || 'Bloqueado';
    Api.createBlock({ date: date, motivo: motivo }).then(function () {
      $('#b-date').value = ''; $('#b-reason').value = '';
      loadBlocks().then(function (blocks) {
        renderBlockList(blocks); renderWeek();
        if (state.selected === date) renderList(state.selected);
        toast('Día bloqueado ✓ — la web ya no lo ofrece');
      });
    });
  }

  /* ============================================================
     TOAST
     ============================================================ */
  var tT;
  function toast(msg) {
    $('#toast-msg').textContent = msg;
    $('#toast').classList.add('show');
    clearTimeout(tT);
    tT = setTimeout(function () { $('#toast').classList.remove('show'); }, 2400);
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  function enterApp() {
    loadBlocks().then(function () {
      state.selected = Api.todayISO();
      state.weekStart = Api.mondayISO(state.selected);
      renderWeek();
      renderList(state.selected);
      show('agenda');
    });
  }

  function wire() {
    // teclado del PIN
    $$('#pad .key').forEach(function (k) {
      if (k.classList.contains('blank') || k.id) return;
      k.addEventListener('click', function () { pressKey(k.textContent.trim()); });
    });
    $('#back').addEventListener('click', function () { if (pin.length > 0) { pin = pin.slice(0, -1); renderDots(); } });

    // chips de tamaño y recordatorio
    $$('#f-size .chip').forEach(function (c) {
      c.addEventListener('click', function () { setChip('#f-size', c.getAttribute('data-v')); updPrice(); });
    });
    $$('#f-rem .chip').forEach(function (c) {
      c.addEventListener('click', function () { setChip('#f-rem', c.getAttribute('data-v')); });
    });
    $('#f-svc').addEventListener('change', updPrice);

    // botones de guardar
    $('#save-appt').addEventListener('click', saveAppt);
    $('#save-block').addEventListener('click', saveBlock);

    // búsqueda (placeholder de Fase 2)
    var gb = $('#agenda-search'); if (gb) gb.addEventListener('click', function () { toast('Búsqueda — próximamente'); });

    // navegación por [data-go]
    $$('[data-go]').forEach(function (el) {
      el.addEventListener('click', function () {
        var go = el.getAttribute('data-go');
        if (go === 'nueva') { openNew(); }
        else if (go === 'bloquear') { openBlockScreen(); }
        else if (go === 'agenda') { renderList(state.selected); show('agenda'); }
        else { show(go); }
      });
    });

    buildServiceOptions();
    setChip('#f-rem', 10);
    renderDots();
    show('login');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
