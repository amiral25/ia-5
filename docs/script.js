/* =========================================================
   Calculatrice de Durée — logique complète (JS vanilla)
   Aucune dépendance. Tout tourne en local dans le navigateur.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DAY_MS = 86400000;

  /* ---------------------------------------------------------
     1. Formatage
     --------------------------------------------------------- */
  function nf(n, dec) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec === undefined ? 0 : dec });
  }

  /** Secondes → "4h 15min" / "−1h 05min 30s" / "12min" */
  function fmtHMS(sec) {
    var neg = sec < 0, s = Math.round(Math.abs(sec));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    var out = '';
    if (h) out = nf(h) + 'h ' + String(m).padStart(2, '0') + 'min';
    else if (m) out = m + 'min';
    if (r) out += out ? ' ' + String(r).padStart(2, '0') + 's' : r + 's';
    if (!out) out = '0min';
    return (neg ? '−' : '') + out;
  }

  /** Secondes → minutes totales ("255 min") */
  function fmtMinutes(sec) {
    var m = sec / 60;
    var isInt = Math.abs(m - Math.round(m)) < 1e-9;
    return nf(isInt ? Math.round(m) : m, isInt ? 0 : 2) + ' min';
  }

  /* ---------------------------------------------------------
     2. Analyse d'une expression de durée ("2h30 + 1h45 − 20min")
     --------------------------------------------------------- */
  function unitToSeconds(u) {
    if (/^(j|d|jours?|days?)$/.test(u)) return 86400;
    if (/^(h|hr|hrs|heures?|hours?)$/.test(u)) return 3600;
    if (/^(m|mn|min|mins|minutes?)$/.test(u)) return 60;
    return 1;
  }

  /** Un terme isolé → secondes (null si illisible) */
  function parseTerm(raw) {
    var t = String(raw).toLowerCase().replace(/\s+/g, '').replace(/[’']/g, '');
    if (!t) return null;

    // Format 2:30 ou 2:30:15
    if (t.indexOf(':') > -1) {
      var p = t.split(':');
      if (p.length > 3) return null;
      var tot = 0, mult = [3600, 60, 1];
      for (var i = 0; i < p.length; i++) {
        if (p[i] === '') { p[i] = '0'; }
        if (!/^\d+([.,]\d+)?$/.test(p[i])) return null;
        tot += parseFloat(p[i].replace(',', '.')) * mult[i];
      }
      return tot;
    }

    var re = /(\d+(?:[.,]\d+)?)\s*(jours?|days?|heures?|hours?|minutes?|secondes?|seconds?|hrs?|mins?|mn|[hjmsd])?/g;
    var mm, total = 0, found = false, lastMult = 0, consumed = 0;
    while ((mm = re.exec(t)) !== null) {
      found = true;
      consumed += mm[0].length;
      var val = parseFloat(mm[1].replace(',', '.'));
      var unit = mm[2];
      var mult;
      if (unit) {
        mult = unitToSeconds(unit);
      } else {
        // Nombre sans unité : héritage du contexte (2h30 → 30 = minutes)
        if (lastMult === 3600) mult = 60;
        else if (lastMult === 60) mult = 1;
        else if (lastMult === 86400) mult = 3600;
        else mult = 3600; // nombre seul = heures
      }
      total += val * mult;
      lastMult = mult;
    }
    if (!found || consumed !== t.length) return null; // caractères parasites
    return total;
  }

  /** Expression complète → { seconds } ou { error } */
  function parseExpression(expr) {
    var s = String(expr).replace(/[−–—]/g, '-').replace(/\bplus\b/gi, '+').replace(/\bmoins\b/gi, '-').trim();
    if (!s) return { empty: true };
    if (/^[+-]/.test(s) === false) s = '+' + s;

    var tokens = s.match(/[+-][^+-]*/g);
    if (!tokens) return { error: 'Expression illisible.' };

    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var sign = tokens[i][0] === '-' ? -1 : 1;
      var body = tokens[i].slice(1).trim();
      if (!body) return { error: 'Il manque une durée après « ' + tokens[i][0] +' ».' };
      var v = parseTerm(body);
      if (v === null) return { error: '« ' + body + ' » n\'est pas une durée valide.' };
      total += sign * v;
    }
    return { seconds: total };
  }

  /* ---------------------------------------------------------
     3. Jours fériés français (métropole)
     --------------------------------------------------------- */
  var holidayCache = {};

  function easterUTC(y) { // algorithme de Meeus/Jones/Butcher
    var a = y % 19, b = Math.floor(y / 100), c = y % 100,
        d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
        m = Math.floor((a + 11 * h + 22 * l) / 451),
        month = Math.floor((h + l - 7 * m + 114) / 31),
        day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day);
  }

  function holidaysOf(year) {
    if (holidayCache[year]) return holidayCache[year];
    var set = Object.create(null);
    var fixed = [[0, 1], [4, 1], [4, 8], [6, 14], [7, 15], [10, 1], [10, 11], [11, 25]];
    for (var i = 0; i < fixed.length; i++) set[Date.UTC(year, fixed[i][0], fixed[i][1])] = 1;
    var e = easterUTC(year);
    set[e + 1 * DAY_MS] = 1;   // lundi de Pâques
    set[e + 39 * DAY_MS] = 1;  // Ascension
    set[e + 50 * DAY_MS] = 1;  // lundi de Pentecôte
    holidayCache[year] = set;
    return set;
  }

  function isHoliday(ts) {
    return !!holidaysOf(new Date(ts).getUTCFullYear())[ts];
  }

  /* ---------------------------------------------------------
     4. Affichage du résultat
     --------------------------------------------------------- */
  var elValue = $('#res-value'), elLabel = $('#res-label'),
      elGrid = $('#res-grid'), elErr = $('#res-err'), elNote = $('#res-note');
  var lastResult = { text: '', input: '', summary: '' };

  function render(o) {
    elLabel.textContent = o.label || 'Résultat';
    elValue.textContent = o.value;
    var html = '';
    (o.cells || []).forEach(function (c) {
      html += '<div class="res-cell"><b>' + c.v + '</b><span>' + c.l + '</span></div>';
    });
    elGrid.innerHTML = html;
    if (o.error) { elErr.textContent = o.error; elErr.classList.remove('is-hidden'); }
    else elErr.classList.add('is-hidden');
    if (o.note) { elNote.textContent = o.note; elNote.classList.remove('is-hidden'); }
    else elNote.classList.add('is-hidden');

    lastResult = {
      text: o.copy || o.value,
      input: o.input || '',
      summary: o.value,
      valid: !o.error && !o.idle
    };
    if (lastResult.valid) queueHistory();
  }

  /* ---------------------------------------------------------
     5. Onglet 1 — Addition / soustraction
     --------------------------------------------------------- */
  var rowsBox = $('#rows'), quick = $('#quick');

  function rowTemplate(h, m, s, sign) {
    var minus = sign === '-';
    var d = document.createElement('div');
    d.className = 'row';
    d.innerHTML =
      '<div class="sign-group" role="group" aria-label="Ajouter ou soustraire cette durée">' +
        '<button type="button" class="sg-btn sg-plus' + (minus ? '' : ' is-on') + '" data-sign="+"' +
        ' aria-pressed="' + (minus ? 'false' : 'true') + '" title="Additionner cette durée">+</button>' +
        '<button type="button" class="sg-btn sg-minus' + (minus ? ' is-on' : '') + '" data-sign="-"' +
        ' aria-pressed="' + (minus ? 'true' : 'false') + '" title="Soustraire cette durée">−</button>' +
      '</div>' +
      '<input class="inp r-h" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="Heures" value="' + (h === undefined ? '' : h) + '">' +
      '<input class="inp r-m" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="Minutes" value="' + (m === undefined ? '' : m) + '">' +
      '<input class="inp r-s" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="Secondes" value="' + (s === undefined ? '' : s) + '">' +
      '<button class="row-del" type="button" aria-label="Supprimer cette ligne">×</button>';
    return d;
  }

  function buildRows(list) {
    rowsBox.innerHTML = '<div class="row-units" aria-hidden="true"><span>Ajouter / Retirer</span><span>Heures</span><span>Minutes</span><span>Sec.</span><span></span></div>';
    (list || [[2, 30, ''], [1, 45, '']]).forEach(function (r) {
      rowsBox.appendChild(rowTemplate(r[0], r[1], r[2], r[3]));
    });
  }

  /** Signe actif d'une ligne : '+' ou '-' */
  function rowSign(row) {
    var on = $('.sg-btn.is-on', row);
    return on && on.dataset.sign === '-' ? '-' : '+';
  }

  function sumRows() {
    var total = 0, filled = false;
    $$('.row', rowsBox).forEach(function (row) {
      var sign = rowSign(row) === '-' ? -1 : 1;
      var h = parseFloat($('.r-h', row).value) || 0;
      var m = parseFloat($('.r-m', row).value) || 0;
      var s = parseFloat($('.r-s', row).value) || 0;
      if ($('.r-h', row).value || $('.r-m', row).value || $('.r-s', row).value) filled = true;
      total += sign * (h * 3600 + m * 60 + s);
    });
    return { seconds: total, filled: filled };
  }

  function calcTab1() {
    var q = quick.value.trim(), sec, input;

    if (q) {
      var r = parseExpression(q);
      if (r.error) {
        return render({ label: 'Addition de durées', value: '—', error: r.error, idle: true });
      }
      sec = r.seconds; input = q;
    } else {
      var rows = sumRows();
      if (!rows.filled) {
        return render({ label: 'Addition de durées', value: '0h 00min', idle: true,
          cells: [{ v: '0,00 h', l: 'Décimal' }, { v: '0 min', l: 'Minutes totales' }, { v: '0 s', l: 'Secondes' }] });
      }
      sec = rows.seconds;
      input = $$('.row', rowsBox).map(function (row) {
        var h = $('.r-h', row).value || 0, m = $('.r-m', row).value || 0, s = $('.r-s', row).value || 0;
        if (!+h && !+m && !+s) return '';
        return rowSign(row) + ' ' + h + 'h' + String(m).padStart(2, '0') + (+s ? ':' + s : '');
      }).filter(Boolean).join(' ').replace(/^\+\s/, '');
    }

    render({
      label: 'Total des durées',
      value: fmtHMS(sec),
      input: input,
      cells: [
        { v: nf(sec / 3600, 2), l: 'Heures décimales' },
        { v: fmtMinutes(sec), l: 'Minutes totales' },
        { v: nf(Math.round(sec)) + ' s', l: 'Secondes totales' }
      ],
      copy: fmtHMS(sec) + '  (' + nf(sec / 3600, 2) + ' h décimales · ' + fmtMinutes(sec) + ')'
    });
  }

  /* ---------------------------------------------------------
     6. Onglet 2 — Durée entre deux heures
     --------------------------------------------------------- */
  var hStart = $('#h-start'), hEnd = $('#h-end'), hPause = $('#h-pause'), hNote = $('#h-note');

  function timeToSec(v) {
    var p = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v || '');
    if (!p) return null;
    return (+p[1]) * 3600 + (+p[2]) * 60 + (p[3] ? +p[3] : 0);
  }

  function calcTab2() {
    var a = timeToSec(hStart.value), b = timeToSec(hEnd.value);
    var pause = Math.max(0, parseFloat(hPause.value) || 0) * 60;

    if (a === null || b === null) {
      hNote.classList.add('is-hidden');
      return render({ label: 'Durée entre 2 heures', value: '—', idle: true,
        error: 'Renseignez une heure de début et une heure de fin.' });
    }

    var overnight = b < a; // heures identiques = durée nulle, pas 24 h
    hNote.classList.toggle('is-hidden', !overnight);
    var gross = overnight ? b + 86400 - a : b - a;
    var net = gross - pause;

    render({
      label: overnight ? 'Temps net (service de nuit)' : 'Temps net travaillé',
      value: fmtHMS(net),
      input: hStart.value + ' → ' + hEnd.value + (pause ? ' − ' + (pause / 60) + ' min' : ''),
      cells: [
        { v: nf(net / 3600, 2), l: 'Heures décimales' },
        { v: fmtMinutes(net), l: 'Minutes totales' },
        { v: fmtHMS(gross), l: 'Amplitude brute' },
        { v: fmtHMS(pause), l: 'Pause déduite' }
      ],
      error: net < 0 ? 'La pause est plus longue que la période sélectionnée.' : '',
      copy: 'De ' + hStart.value + ' à ' + hEnd.value + (pause ? ' (pause ' + (pause / 60) + ' min)' : '') +
            ' = ' + fmtHMS(net) + '  (' + nf(net / 3600, 2) + ' h décimales · ' + fmtMinutes(net) + ')'
    });
  }

  /* ---------------------------------------------------------
     7. Onglet 3 — Durée entre deux dates
     --------------------------------------------------------- */
  var dStart = $('#d-start'), dEnd = $('#d-end'),
      dWe = $('#d-weekend'), dHol = $('#d-holidays');

  function dateToUTC(v) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return p ? Date.UTC(+p[1], +p[2] - 1, +p[3]) : null;
  }
  function toFR(ts) {
    var d = new Date(ts);
    return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear();
  }

  function calcTab3() {
    var a = dateToUTC(dStart.value), b = dateToUTC(dEnd.value);
    if (a === null || b === null) {
      return render({ label: 'Durée entre 2 dates', value: '—', idle: true,
        error: 'Sélectionnez une date de début et une date de fin.' });
    }

    var from = Math.min(a, b), to = Math.max(a, b);
    var days = Math.round((to - from) / DAY_MS);

    if (days > 200000) {
      return render({ label: 'Durée entre 2 dates', value: '—', idle: true, error: 'Plage trop large (max. ~500 ans).' });
    }

    // Décomposition calendaire années / mois / jours
    var d1 = new Date(from), d2 = new Date(to);
    var y = d2.getUTCFullYear() - d1.getUTCFullYear();
    var mo = d2.getUTCMonth() - d1.getUTCMonth();
    var dd = d2.getUTCDate() - d1.getUTCDate();
    if (dd < 0) {
      mo--;
      dd += new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), 0)).getUTCDate();
    }
    if (mo < 0) { mo += 12; y--; }

    // Jours ouvrés (bornes incluses)
    var work = 0, skipWe = dWe.checked, skipHol = dHol.checked;
    for (var ts = from; ts <= to; ts += DAY_MS) {
      var wd = new Date(ts).getUTCDay();
      if (skipWe && (wd === 0 || wd === 6)) continue;
      if (skipHol && isHoliday(ts)) continue;
      work++;
    }

    var weeks = Math.floor(days / 7), remDays = days % 7;
    var breakdown = (y ? y + ' an' + (y > 1 ? 's' : '') + ' ' : '') + (mo ? mo + ' mois ' : '') + dd + ' j';
    var workLabel = skipWe ? (skipHol ? 'Jours ouvrés' : 'Jours hors week-end') : (skipHol ? 'Jours hors fériés' : 'Jours comptés');

    render({
      label: 'Écart entre le ' + toFR(from) + ' et le ' + toFR(to),
      value: nf(days) + (days > 1 ? ' jours' : ' jour'),
      input: toFR(from) + ' → ' + toFR(to),
      cells: [
        { v: nf(work), l: workLabel + ' *' },
        { v: weeks + ' sem. ' + remDays + ' j', l: 'Semaines' },
        { v: breakdown.trim(), l: 'Détail calendaire' },
        { v: nf(days + 1), l: 'Jours inclus *' },
        { v: nf(days * 24), l: 'Heures' }
      ],
      note: '* bornes incluses (la date de début et la date de fin sont comptées).',
      copy: 'Du ' + toFR(from) + ' au ' + toFR(to) + ' : ' + nf(days) + ' jours d\'écart · ' +
            nf(days + 1) + ' jours bornes incluses · ' + nf(work) + ' ' + workLabel.toLowerCase() +
            ' · ' + breakdown.trim()
    });
  }

  /* ---------------------------------------------------------
     8. Onglets
     --------------------------------------------------------- */
  var current = 1;
  function compute() {
    if (current === 1) calcTab1();
    else if (current === 2) calcTab2();
    else calcTab3();
  }

  function activate(n) {
    current = n;
    $$('.tab').forEach(function (t, i) {
      var on = i + 1 === n;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    $$('.panel').forEach(function (p, i) {
      var on = i + 1 === n;
      p.classList.toggle('is-hidden', !on);
      if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });
    compute();
  }

  $$('.tab').forEach(function (t, i) {
    t.addEventListener('click', function () { activate(i + 1); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight') n = (i + 1) % 3 + 1;
      if (k === 'ArrowLeft') n = (i + 2) % 3 + 1;
      if (n) { e.preventDefault(); activate(n); $('#tab-' + n).focus(); }
    });
  });

  /* ---------------------------------------------------------
     9. Historique local (5 derniers calculs)
     --------------------------------------------------------- */
  var HKEY = 'cd-hist', histBox = $('#history-box'), histList = $('#history-list'), histTimer;

  function readHist() {
    try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; }
  }
  function writeHist(a) {
    try { localStorage.setItem(HKEY, JSON.stringify(a)); } catch (e) {}
  }
  function drawHist() {
    var h = readHist();
    histBox.hidden = h.length === 0;
    histList.innerHTML = h.map(function (it) {
      return '<li><span class="h-in">' + esc(it.i) + '</span><span class="h-out">' + esc(it.o) + '</span></li>';
    }).join('');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function queueHistory() {
    if (!userTouched) return; // pas d'enregistrement pour l'exemple affiché au chargement
    clearTimeout(histTimer);
    var snap = { i: lastResult.input || '—', o: lastResult.summary };
    histTimer = setTimeout(function () {
      if (!snap.i || snap.i === '—') return;
      var h = readHist();
      if (h.length && h[0].i === snap.i && h[0].o === snap.o) return;
      h.unshift(snap);
      writeHist(h.slice(0, 5));
      drawHist();
    }, 1600);
  }
  $('#btn-clear-hist').addEventListener('click', function () { writeHist([]); drawHist(); });

  /* ---------------------------------------------------------
     10. Actions : copier / effacer / thème / toast
     --------------------------------------------------------- */
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2000);
  }

  $('#btn-copy').addEventListener('click', function () {
    var txt = lastResult.text || '';
    if (!txt || txt === '—') { showToast('Rien à copier pour l\'instant'); return; }
    var done = function () { showToast('Résultat copié ✓'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    } else fallbackCopy(txt, done);
  });

  function fallbackCopy(txt, cb) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { showToast('Copie impossible'); }
    document.body.removeChild(ta);
  }

  $('#btn-reset').addEventListener('click', function () {
    if (current === 1) { quick.value = ''; buildRows([['', '', ''], ['', '', '']]); }
    else if (current === 2) { hStart.value = ''; hEnd.value = ''; hPause.value = 0; syncChips(); }
    else { setDefaultDates(); dWe.checked = true; dHol.checked = true; }
    compute();
    showToast('Champs réinitialisés');
  });

  $('#theme-toggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('cd-theme', next); } catch (e) {}
  });

  /* ---------------------------------------------------------
     11. Câblage des événements
     --------------------------------------------------------- */
  var userTouched = false;
  ['input', 'click'].forEach(function (ev) {
    $('#calculatrice').addEventListener(ev, function () { userTouched = true; }, true);
  });

  rowsBox.addEventListener('input', compute);
  rowsBox.addEventListener('click', function (e) {
    var sg = e.target.closest('.sg-btn');
    if (sg) {
      $$('.sg-btn', sg.closest('.sign-group')).forEach(function (b) {
        var on = b === sg;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      compute(); return;
    }
    var del = e.target.closest('.row-del');
    if (del) {
      if ($$('.row', rowsBox).length > 1) del.closest('.row').remove();
      else buildRows([['', '', '']]);
      compute();
    }
  });

  function appendRow(sign) {
    rowsBox.appendChild(rowTemplate('', '', '', sign));
    $('.row:last-child .r-h', rowsBox).focus();
  }
  $('#add-row').addEventListener('click', function () { appendRow('+'); });
  $('#sub-row').addEventListener('click', function () { appendRow('-'); });
  quick.addEventListener('input', compute);

  [hStart, hEnd, hPause].forEach(function (el) { el.addEventListener('input', compute); });
  function syncChips() {
    var v = String(parseFloat(hPause.value) || 0);
    $$('.chip').forEach(function (c) { c.classList.toggle('is-on', c.dataset.pause === v); });
  }
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () { hPause.value = c.dataset.pause; syncChips(); compute(); });
  });
  hPause.addEventListener('input', syncChips);

  [dStart, dEnd, dWe, dHol].forEach(function (el) { el.addEventListener('input', compute); });

  /* ---------------------------------------------------------
     12. Initialisation
     --------------------------------------------------------- */
  function setDefaultDates() {
    var now = new Date();
    var t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    dStart.value = new Date(t).toISOString().slice(0, 10);
    dEnd.value = new Date(t + 30 * DAY_MS).toISOString().slice(0, 10);
  }

  $('#year').textContent = new Date().getFullYear();
  // Les lignes de départ sont déjà dans le HTML (évite tout décalage au chargement)
  if (!$('.row', rowsBox)) buildRows();
  setDefaultDates();
  syncChips();
  drawHist();
  activate(1);
})();
