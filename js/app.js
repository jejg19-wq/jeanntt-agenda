/* ============================================================
   Jeanntt Agenda — lógica de la app (UI)
   Lee/escribe SIEMPRE a través de JeannttApi (capa de datos),
   ya conectada al backend real. Pantallas y diseño intactos;
   aquí se añaden: "¿Quién eres?", buscador con historial,
   vista de mes, contacto del cliente y totales de $.
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
  function money(n) { n = Math.round(n || 0); return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /* ---------- etiquetas de fecha en español ---------- */
  var DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];        // lunes-primero
  var DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MES_COR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function parts(iso) { var p = iso.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dowIdx(iso) { var p = parts(iso); var d = new Date(p.y, p.m - 1, p.d); return (d.getDay() + 6) % 7; }
  function longDate(iso) { var p = parts(iso); return DOW_LONG[dowIdx(iso)] + ' ' + p.d + ' de ' + MES[p.m - 1]; }
  function blkDate(iso) { return longDate(iso); }
  function monthLabel(iso) { var p = parts(iso); return MES[p.m - 1] + ' ' + p.y; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v5h5"/><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.06 24l1.69-6.16a11.87 11.87 0 0 1-1.6-5.96C.16 5.32 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.78 11.78 0 0 1 3.48 8.4c0 6.55-5.34 11.88-11.9 11.88a11.93 11.93 0 0 1-5.7-1.45L.06 24zM6.6 20.13c1.68 1 3.28 1.6 5.4 1.6 5.45 0 9.9-4.43 9.9-9.88a9.8 9.8 0 0 0-2.9-7 9.74 9.74 0 0 0-6.98-2.9c-5.46 0-9.9 4.43-9.9 9.88a9.78 9.78 0 0 0 1.5 5.22l-.98 3.58 3.96-1.5zM17.5 14.3c-.07-.12-.27-.2-.56-.34-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5l-.57-.02c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41z"/></svg>'
  };

  /* ---------- estado ---------- */
  var state = {
    selected: Api.todayISO(),
    weekStart: Api.mondayISO(Api.todayISO()),
    view: 'week',                         // 'week' | 'month'
    monthAnchor: Api.firstOfMonthISO(Api.todayISO()),
    blocks: [],                           // bloqueos (lista completa)
    blockedSet: {},                       // 'YYYY-MM-DD' -> true
    appts: [],                            // citas del rango visible (semana o mes)
    apptDates: {},                        // 'YYYY-MM-DD' -> nº de citas (no canceladas)
    byId: {},                             // caché id -> cita (alimenta el detalle, sin GET /:id)
    usuario: '',                          // quién está usando la app (¿Quién eres?)
    editingId: null,
    searchPool: []                        // citas del rango amplio para el buscador
  };

  function cacheAppts(list) { (list || []).forEach(function (a) { if (a && a.id != null) state.byId[a.id] = a; }); return list; }

  /* ---------- navegación entre pantallas ---------- */
  var NO_TABBAR = { login: 1, quien: 1 };
  function show(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    $('#tabbar').style.display = NO_TABBAR[id] ? 'none' : 'flex';
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-go') === id); });
    var sc = $('.scroll', $('#' + id)); if (sc) sc.scrollTop = 0;
  }

  /* ---------- manejo de errores de red ---------- */
  function fail(e, msg) {
    console.error('[Jeanntt]', msg || 'Error', e);
    if (e && e.status === 401) { toast('Tu sesión expiró. Vuelve a entrar.'); Api.logout(); show('login'); return; }
    toast(msg || 'No se pudo conectar. Revisa la conexión.');
  }

  /* ============================================================
     LOGIN (PIN)
     ============================================================ */
  var pin = '';
  var pinBusy = false;
  function renderDots() { $$('.dot').forEach(function (d, i) { d.classList.toggle('f', i < pin.length); }); }
  function pinError() {
    var dots = $('.dots'); dots.classList.add('err');
    setTimeout(function () { dots.classList.remove('err'); pin = ''; renderDots(); }, 420);
  }
  function pressKey(n) {
    if (pinBusy || pin.length >= 4) return;
    pin += n; renderDots();
    if (pin.length === 4) {
      var entered = pin;
      pinBusy = true;
      setTimeout(function () {
        Api.login(entered).then(function (ok) {
          pinBusy = false;
          if (ok) { pin = ''; renderDots(); openQuien(); }
          else { pinError(); }
        });
      }, 200);
    }
  }

  /* ============================================================
     ¿QUIÉN ERES?  (tras login; sin PINs distintos)
     ============================================================ */
  function buildQuien() {
    var box = $('#qbtns'); box.innerHTML = '';
    Api.usuarios().forEach(function (name) {
      var b = document.createElement('button');
      b.className = 'qbtn';
      b.innerHTML = '<span class="qav">' + esc(name.charAt(0)) + '</span>' + esc(name);
      b.addEventListener('click', function () { pickUsuario(name); });
      box.appendChild(b);
    });
  }
  function openQuien() { buildQuien(); show('quien'); }
  function pickUsuario(name) {
    state.usuario = name;
    paintWhoami();
    enterApp();
  }
  function paintWhoami() {
    var w = $('#whoami');
    if (!w) return;
    w.innerHTML = '<span class="wav">' + esc((state.usuario || '?').charAt(0)) + '</span>' + esc(state.usuario || '—');
  }

  /* ============================================================
     AGENDA — datos del rango visible (semana o mes)
     ============================================================ */
  function loadBlocks() {
    return Api.listBlocks().then(function (blocks) {
      state.blocks = blocks;
      state.blockedSet = {};
      blocks.forEach(function (b) { if (b && b.date) state.blockedSet[b.date] = true; });
      return blocks;
    });
  }

  // rango de fechas a cargar según la vista actual
  function rangeForView() {
    if (state.view === 'month') {
      var start = Api.mondayISO(state.monthAnchor);     // lunes en/antes del día 1
      return { from: start, to: Api.addDaysISO(start, 41) }; // rejilla de 6 semanas
    }
    return { from: state.weekStart, to: Api.addDaysISO(state.weekStart, 6) };
  }

  // recarga bloqueos + citas del rango y repinta todo
  function refreshAgenda() {
    var r = rangeForView();
    return Promise.all([loadBlocks(), Api.listAppointmentsRange(r.from, r.to)])
      .then(function (res) {
        state.appts = res[1] || [];
        cacheAppts(state.appts);
        state.apptDates = {};
        state.appts.forEach(function (a) {
          if (!Api.esCancelada(a) && a.date) state.apptDates[a.date] = (state.apptDates[a.date] || 0) + 1;
        });
        paintAgenda();
      })
      .catch(function (e) { fail(e, 'No se pudo cargar la agenda.'); });
  }

  // repinta sin volver a pedir datos (al seleccionar día, cambiar de pestaña, etc.)
  function paintAgenda() {
    if (state.view === 'month') { $('#week').style.display = 'none'; $('#month').style.display = ''; renderMonth(); }
    else { $('#month').style.display = 'none'; $('#week').style.display = ''; renderWeek(); }
    renderCalHead();
    renderList(state.selected);
    renderTotals();
  }

  function renderCalHead() {
    var lbl = (state.view === 'month') ? monthLabel(state.monthAnchor) : monthLabel(state.selected);
    $('#cal-label').textContent = cap(lbl);
    $('#cal-toggle').textContent = (state.view === 'month') ? 'Semana' : 'Mes';
  }

  function renderWeek() {
    var w = $('#week'); w.innerHTML = '';
    var today = Api.todayISO();
    for (var i = 0; i < 7; i++) {
      (function (iso, name) {
        var cls = 'day' +
          (iso === state.selected ? ' sel' : '') +
          (state.blockedSet[iso] ? ' blocked' : '') +
          (state.apptDates[iso] ? ' has' : '') +
          (iso === today ? ' today' : '');
        var el = document.createElement('div');
        el.className = cls;
        el.innerHTML = '<div class="dn">' + name + '</div><div class="dd">' + parts(iso).d + '</div>';
        el.addEventListener('click', function () { selectDay(iso); });
        w.appendChild(el);
      })(Api.addDaysISO(state.weekStart, i), DOW_SHORT[i]);
    }
  }

  function renderMonth() {
    var anchor = state.monthAnchor, am = parts(anchor).m;
    var start = Api.mondayISO(anchor), today = Api.todayISO();
    var html = '<div class="mdow">' + DOW_SHORT.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="mgrid">';
    for (var i = 0; i < 42; i++) {
      var iso = Api.addDaysISO(start, i);
      var cls = 'mcell' +
        (parts(iso).m !== am ? ' out' : '') +
        (iso === state.selected ? ' sel' : '') +
        (state.blockedSet[iso] ? ' blocked' : '') +
        (state.apptDates[iso] ? ' has' : '') +
        (iso === today ? ' today' : '');
      html += '<div class="' + cls + '" data-iso="' + iso + '"><span class="mn">' + parts(iso).d + '</span></div>';
    }
    html += '</div>';
    var m = $('#month'); m.innerHTML = html;
    $$('.mcell', m).forEach(function (cell) {
      cell.addEventListener('click', function () {
        var iso = cell.getAttribute('data-iso');
        if (Api.firstOfMonthISO(iso) !== state.monthAnchor) {
          // tocó un día de otro mes: muévete a ese mes y recarga sus datos
          state.monthAnchor = Api.firstOfMonthISO(iso);
          state.selected = iso; state.weekStart = Api.mondayISO(iso);
          refreshAgenda();
        } else {
          selectDay(iso);
        }
      });
    });
  }

  function selectDay(iso) {
    state.selected = iso;
    state.weekStart = Api.mondayISO(iso);
    paintAgenda();
  }

  function renderList(iso) {
    var blocked = !!state.blockedSet[iso];
    $('#dt-day').textContent = cap(longDate(iso)) + (blocked ? ' — bloqueado' : '');

    if (blocked) {
      $('#dt-count').textContent = '';
      $('#agenda-sub').textContent = 'Día bloqueado';
      $('#list').innerHTML = emptyState('lock', 'Día bloqueado', 'Agenda llena. La web no ofrece este día.');
      return;
    }

    var appts = state.appts.filter(function (a) { return a.date === iso && !Api.esCancelada(a); })
      .sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });

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
  }

  function renderTotals() {
    var dayTot = 0, weekTot = 0;
    var wStart = state.weekStart, wEnd = Api.addDaysISO(state.weekStart, 6);
    state.appts.forEach(function (a) {
      if (!Api.esConfirmada(a)) return;
      var p = Api.precioDeCita(a);
      if (a.date === state.selected) dayTot += p;
      if (a.date >= wStart && a.date <= wEnd) weekTot += p;
    });
    $('#tot-day').textContent = money(dayTot);
    $('#tot-week').textContent = money(weekTot);
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
     DETALLE  (lee de la caché; sin GET /:id en el contrato)
     ============================================================ */
  function telDigits(tel) { return String(tel || '').replace(/[^\d+]/g, ''); }

  function openDetail(id) {
    var a = state.byId[id];
    show('detalle');
    if (!a) { $('#detail-body').innerHTML = emptyState('cal', 'Cita no encontrada', 'Vuelve a la agenda e inténtalo de nuevo.'); return; }

    var t = to12(a.time);
    var precio = Api.precioDeCita(a);
    var manual = Api.esManual(a);
    var tel = a.telefono ? telDigits(a.telefono) : '';
    var waNum = tel.replace(/^\+/, '');

    var contacto = a.telefono
      ? '<div class="contactbtns">' +
          '<a class="cbtn wa" href="https://wa.me/' + esc(waNum) + '" target="_blank" rel="noopener">' + SVG.wa + ' WhatsApp</a>' +
          '<a class="cbtn call" href="tel:' + esc(tel) + '">' + SVG.phone + ' Llamar</a>' +
        '</div>'
      : '';

    var acciones = manual
      ? '<div class="detailbtns">' +
          '<button class="cta obtn" id="d-edit">' + SVG.pen + ' Editar</button>' +
          '<button class="cta red" id="d-cancel">' + SVG.trash + ' Cancelar</button>' +
        '</div>'
      : '<div class="webnote">' + SVG.lock +
          '<span>Esta reserva entró por la <b>web</b>. Solo se editan o cancelan las citas que agenda el equipo.</span></div>';

    $('#detail-body').innerHTML =
      '<div class="detailcard"><div class="bigtime">' + esc(t.h) + ' ' + esc(t.ap) + '</div>' +
      '<div class="bigdog">' + esc(a.peludo || 'Peludo') + '</div>' +
      '<div class="bigsvc">' + esc(a.servicio) + ' · ' + esc(a.tamano) + '</div></div>' +
      '<div class="detailcard" style="text-align:left;padding:6px 18px">' +
        dl(SVG.cal, cap(longDate(a.date))) +
        dl(SVG.user, a.cliente || '—') +
        dl(SVG.phone, a.telefono || '—') +
        (a.creado_por ? dl(SVG.pen, 'Agendó: ' + a.creado_por) : '') +
        dl(SVG.bell, a.recordatorio + ' min antes') +
        (precio ? dl(SVG.tag, money(precio)) : '') +
        dl(SVG.note, a.notas || '—') +
      '</div>' +
      contacto +
      acciones;

    if (manual) {
      $('#d-edit').addEventListener('click', function () { openEdit(id); });
      $('#d-cancel').addEventListener('click', function () {
        Api.cancelAppointment(id).then(function () {
          if (state.byId[id]) state.byId[id].estado = 'cancelada';
          refreshAgenda(); show('agenda'); toast('Cita cancelada');
        }).catch(function (e) { fail(e, 'No se pudo cancelar la cita.'); });
      });
    }
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
    var a = state.byId[id];
    if (!a) { toast('No se encontró la cita.'); return; }
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
  }

  function saveAppt() {
    var orig = state.editingId ? state.byId[state.editingId] : null;
    var servicio = $('#f-svc').value, tamano = selVal('#f-size');
    var payload = {
      cliente: $('#f-cli').value.trim(),
      telefono: $('#f-tel').value.trim(),
      peludo: $('#f-dog').value.trim(),
      tamano: tamano,
      servicio: servicio,
      date: $('#f-date').value,
      time: $('#f-time').value,
      recordatorio: parseInt(selVal('#f-rem') || '10', 10),
      notas: $('#f-notes').value.trim(),
      // quién agenda: en edición se conserva el autor original; en alta, el usuario actual
      creado_por: orig ? (orig.creado_por || state.usuario) : state.usuario,
      precio: Api.precio(servicio, tamano)
    };

    var falta =
      !payload.cliente ? 'el nombre del cliente' :
      !payload.peludo ? 'el nombre del peludo' :
      !payload.tamano ? 'el tamaño' :
      !payload.servicio ? 'el servicio' :
      !payload.date ? 'la fecha' :
      !payload.time ? 'la hora' : null;
    if (falta) { toast('Falta ' + falta); return; }

    var btn = $('#save-appt'); btn.disabled = true;
    var op = state.editingId
      ? Api.updateAppointment(state.editingId, payload)
      : Api.createAppointment(payload);

    op.then(function () {
      var editing = state.editingId;
      state.editingId = null;
      btn.disabled = false;
      // mueve la vista al día de la cita y recarga la agenda para verla reflejada
      state.selected = payload.date;
      state.weekStart = Api.mondayISO(payload.date);
      if (state.view === 'month') state.monthAnchor = Api.firstOfMonthISO(payload.date);
      show('agenda');
      refreshAgenda();
      toast(editing ? 'Cita actualizada ✓' : 'Cita guardada ✓ — bloqueada en la web');
    }).catch(function (e) { btn.disabled = false; fail(e, 'No se pudo guardar la cita.'); });
  }

  /* ============================================================
     BUSCADOR CON HISTORIAL (incluye fechas pasadas)
     ============================================================ */
  function openSearch() {
    show('buscar');
    $('#s-q').value = '';
    $('#s-res').innerHTML = '';
    $('#s-hint').textContent = 'Cargando historial…';
    var d = (window.CONFIG && CONFIG.BUSQUEDA_DIAS) || { atras: 540, adelante: 365 };
    var from = Api.addDaysISO(Api.todayISO(), -Math.abs(d.atras));
    var to = Api.addDaysISO(Api.todayISO(), Math.abs(d.adelante));
    Api.listAppointmentsRange(from, to).then(function (list) {
      state.searchPool = list || [];
      cacheAppts(state.searchPool);
      $('#s-hint').textContent = 'Busca por nombre del peludo o del cliente. Incluye fechas pasadas.';
      $('#s-q').focus();
      renderSearch('');
    }).catch(function (e) { $('#s-hint').textContent = ''; fail(e, 'No se pudo cargar el historial.'); });
  }

  function renderSearch(q) {
    var box = $('#s-res');
    var query = Api.norm(q.trim());
    if (!query) { box.innerHTML = ''; return; }
    var hits = state.searchPool.filter(function (a) {
      return Api.norm(a.peludo).indexOf(query) !== -1 || Api.norm(a.cliente).indexOf(query) !== -1;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.time < b.time ? 1 : -1); }); // recientes primero

    if (!hits.length) {
      box.innerHTML = emptyState('cal', 'Sin resultados', 'No hay citas para “' + esc(q.trim()) + '”.');
      return;
    }
    box.innerHTML = '';
    hits.forEach(function (a) {
      var p = parts(a.date);
      var el = document.createElement('div');
      el.className = 'sres';
      el.innerHTML =
        '<div class="sd"><div class="sday">' + p.d + '</div><div class="smon">' + MES_COR[p.m - 1] + ' ' + p.y + '</div></div>' +
        '<div class="si"><b>' + esc(a.peludo || 'Peludo') + '</b>' +
        '<div class="ss">' + esc(a.cliente || '—') + ' · ' + esc(a.servicio || '') + '</div>' +
        (Api.esCancelada(a) ? '<span class="scancel">cancelada</span>' : '') + '</div>' +
        '<div class="chev">' + SVG.chev + '</div>';
      el.addEventListener('click', function () { openDetail(a.id); });
      box.appendChild(el);
    });
  }

  /* ============================================================
     BLOQUEAR DÍA
     ============================================================ */
  function renderBlockList(blocks) {
    var bl = $('#blocklist');
    if (!blocks.length) { bl.innerHTML = '<div style="font-size:12.5px;color:var(--lav);padding:4px 2px">Ningún día bloqueado.</div>'; return; }
    bl.innerHTML = '';
    blocks.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (b) {
      var d = document.createElement('div'); d.className = 'blk';
      d.innerHTML =
        '<div class="bi">' + SVG.lock + '</div>' +
        '<div class="bt"><b>' + esc(cap(blkDate(b.date))) + '</b><span>' + esc(b.motivo) + '</span></div>' +
        '<div class="del">' + SVG.trash + '</div>';
      $('.del', d).addEventListener('click', function () { removeBlock(b); });
      bl.appendChild(d);
    });
  }

  function openBlockScreen() {
    $('#blocklist').innerHTML = '<div style="font-size:12.5px;color:var(--lav);padding:4px 2px">Cargando…</div>';
    show('bloquear');
    loadBlocks().then(renderBlockList).catch(function (e) { fail(e, 'No se pudieron cargar los bloqueos.'); });
  }

  function removeBlock(b) {
    Api.deleteBlock(b.id).then(function () {
      loadBlocks().then(function (blocks) {
        renderBlockList(blocks);
        toast('Día desbloqueado');
      });
    }).catch(function (e) { fail(e, 'No se pudo desbloquear el día.'); });
  }

  function saveBlock() {
    var date = $('#b-date').value;
    if (!date) { toast('Elige una fecha primero'); return; }
    var motivo = $('#b-reason').value.trim() || 'Bloqueado';
    var btn = $('#save-block'); btn.disabled = true;
    Api.createBlock({ date: date, motivo: motivo }).then(function () {
      $('#b-date').value = ''; $('#b-reason').value = '';
      btn.disabled = false;
      loadBlocks().then(function (blocks) {
        renderBlockList(blocks);
        toast('Día bloqueado ✓ — la web ya no lo ofrece');
      });
    }).catch(function (e) { btn.disabled = false; fail(e, 'No se pudo bloquear el día.'); });
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
    state.selected = Api.todayISO();
    state.weekStart = Api.mondayISO(state.selected);
    state.view = 'week';
    state.monthAnchor = Api.firstOfMonthISO(state.selected);
    paintWhoami();
    show('agenda');
    refreshAgenda();
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

    // guardar
    $('#save-appt').addEventListener('click', saveAppt);
    $('#save-block').addEventListener('click', saveBlock);

    // ¿quién eres? (cambiar de persona desde el chip del encabezado)
    $('#whoami').addEventListener('click', openQuien);

    // buscador
    $('#agenda-search').addEventListener('click', openSearch);
    $('#s-q').addEventListener('input', function () { renderSearch(this.value); });

    // calendario: navegación y semana/mes
    $('#cal-prev').addEventListener('click', function () { navCal(-1); });
    $('#cal-next').addEventListener('click', function () { navCal(1); });
    $('#cal-label').addEventListener('click', function () { goToday(); });
    $('#cal-toggle').addEventListener('click', toggleView);

    // navegación por [data-go]
    $$('[data-go]').forEach(function (el) {
      el.addEventListener('click', function () {
        var go = el.getAttribute('data-go');
        if (go === 'nueva') openNew();
        else if (go === 'bloquear') openBlockScreen();
        else if (go === 'agenda') { show('agenda'); paintAgenda(); }
        else show(go);
      });
    });

    buildServiceOptions();
    setChip('#f-rem', 10);
    renderDots();
    show('login');
  }

  function navCal(dir) {
    if (state.view === 'month') {
      state.monthAnchor = Api.addMonthsISO(state.monthAnchor, dir);
      // al cambiar de mes, selecciona el día 1 del nuevo mes
      state.selected = state.monthAnchor;
      state.weekStart = Api.mondayISO(state.selected);
    } else {
      state.weekStart = Api.addDaysISO(state.weekStart, dir * 7);
      state.selected = state.weekStart;
    }
    refreshAgenda();
  }

  function toggleView() {
    state.view = (state.view === 'month') ? 'week' : 'month';
    if (state.view === 'month') state.monthAnchor = Api.firstOfMonthISO(state.selected);
    else state.weekStart = Api.mondayISO(state.selected);
    refreshAgenda();
  }

  function goToday() {
    state.selected = Api.todayISO();
    state.weekStart = Api.mondayISO(state.selected);
    state.monthAnchor = Api.firstOfMonthISO(state.selected);
    refreshAgenda();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
