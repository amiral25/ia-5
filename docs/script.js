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

  /** Secondes → "4h 15min" / "−1h 05min 30s" / "12min"
      Avec `avecMs`, la partie décimale de la seconde est rendue : "1min 30s 250ms". */
  function fmtHMS(sec, avecMs) {
    var neg = sec < 0, abs = Math.abs(sec), ms = 0;
    if (avecMs) {
      ms = Math.round((abs - Math.floor(abs)) * 1000);
      abs = Math.floor(abs);
      if (ms === 1000) { ms = 0; abs += 1; } // arrondi qui déborde
    } else {
      abs = Math.round(abs);
    }
    var h = Math.floor(abs / 3600), m = Math.floor((abs % 3600) / 60), r = abs % 60;
    var out = '';
    if (h) out = nf(h) + 'h ' + String(m).padStart(2, '0') + 'min';
    else if (m) out = m + 'min';
    if (r) out += out ? ' ' + String(r).padStart(2, '0') + 's' : r + 's';
    if (ms) out += out ? ' ' + ms + 'ms' : ms + 'ms';
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
     3. Jours fériés de la francophonie
        France · Belgique · Suisse · Luxembourg · Québec
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

  /** n-ième jour de semaine d'un mois. nthWeekday(2026, 8, 1, 1) = 1er lundi de septembre. */
  function nthWeekday(y, month, weekday, n) {
    var first = new Date(Date.UTC(y, month, 1)).getUTCDay();
    return Date.UTC(y, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
  }

  /** Dernier `weekday` STRICTEMENT avant le `day` du mois (fête des Patriotes). */
  function weekdayBefore(y, month, day, weekday) {
    var ts = Date.UTC(y, month, day);
    var back = (new Date(ts).getUTCDay() - weekday + 7) % 7 || 7;
    return ts - back * DAY_MS;
  }

  // fixes  : [mois (0-11), jour, nom]
  // mobiles: [décalage par rapport à Pâques, nom]  (-2 = Vendredi saint)
  var PAYS = {
    fr: {
      nom: 'France', gentile: 'français',
      fixes: [[0, 1, 'Jour de l\'an'], [4, 1, 'Fête du Travail'], [4, 8, 'Victoire 1945'],
              [6, 14, 'Fête nationale'], [7, 15, 'Assomption'], [10, 1, 'Toussaint'],
              [10, 11, 'Armistice 1918'], [11, 25, 'Noël']],
      mobiles: [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']]
    },
    be: {
      nom: 'Belgique', gentile: 'belges',
      fixes: [[0, 1, 'Nouvel An'], [4, 1, 'Fête du Travail'], [6, 21, 'Fête nationale'],
              [7, 15, 'Assomption'], [10, 1, 'Toussaint'], [10, 11, 'Armistice'],
              [11, 25, 'Noël']],
      mobiles: [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']]
    },
    ch: {
      // Seul le 1er août est fédéral : les autres relèvent des cantons.
      // On retient le socle observé dans toute la Suisse romande.
      nom: 'Suisse', gentile: 'suisses',
      fixes: [[0, 1, 'Nouvel An'], [7, 1, 'Fête nationale'], [11, 25, 'Noël']],
      mobiles: [[-2, 'Vendredi saint'], [1, 'Lundi de Pâques'],
                [39, 'Ascension'], [50, 'Lundi de Pentecôte']]
    },
    lu: {
      nom: 'Luxembourg', gentile: 'luxembourgeois',
      fixes: [[0, 1, 'Nouvel An'], [4, 1, 'Fête du Travail'], [4, 9, 'Journée de l\'Europe'],
              [5, 23, 'Fête nationale'], [7, 15, 'Assomption'], [10, 1, 'Toussaint'],
              [11, 25, 'Noël'], [11, 26, 'Saint-Étienne']],
      mobiles: [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']]
    },
    qc: {
      nom: 'Québec', gentile: 'québécois',
      fixes: [[0, 1, 'Jour de l\'An'], [5, 24, 'Fête nationale du Québec'],
              [6, 1, 'Fête du Canada'], [11, 25, 'Noël']],
      mobiles: [[-2, 'Vendredi saint']],
      calcules: function (y) {
        return [
          [weekdayBefore(y, 4, 25, 1), 'Journée nationale des patriotes'], // lundi avant le 25 mai
          [nthWeekday(y, 8, 1, 1), 'Fête du Travail'],                     // 1er lundi de septembre
          [nthWeekday(y, 9, 1, 2), 'Action de grâce']                      // 2e lundi d'octobre
        ];
      }
    }
  };

  function codePays(code) { return PAYS[code] ? code : 'fr'; }

  /** { timestamp UTC → nom du jour férié } pour une année et un pays. */
  function holidaysOf(year, code) {
    code = codePays(code);
    var key = code + ':' + year;
    if (holidayCache[key]) return holidayCache[key];

    var p = PAYS[code], set = Object.create(null), i;
    for (i = 0; i < p.fixes.length; i++) {
      set[Date.UTC(year, p.fixes[i][0], p.fixes[i][1])] = p.fixes[i][2];
    }
    var e = easterUTC(year);
    for (i = 0; i < p.mobiles.length; i++) {
      set[e + p.mobiles[i][0] * DAY_MS] = p.mobiles[i][1];
    }
    if (p.calcules) {
      var sup = p.calcules(year);
      for (i = 0; i < sup.length; i++) set[sup[i][0]] = sup[i][1];
    }
    holidayCache[key] = set;
    return set;
  }

  function isHoliday(ts, code) {
    return !!holidaysOf(new Date(ts).getUTCFullYear(), code)[ts];
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
  var MSKEY = 'cd-ms', optMs = $('#opt-ms');
  var tab1Secondes = 0; // dernier total de l'onglet 1, pour le report

  /** Les millisecondes sont une option : la colonne existe toujours dans le
      DOM, seule sa visibilité change. Ajouter ou retirer des champs au clic
      ferait bouger la mise en page. */
  function msActif() { return optMs.checked; }

  // Le marqueur est posé sur <html>, comme pour le thème : le script d'en-tête
  // le pose avant le premier rendu, donc la colonne ne surgit pas après coup.
  function appliquerMs() {
    if (msActif()) document.documentElement.setAttribute('data-ms', '1');
    else document.documentElement.removeAttribute('data-ms');
    try { localStorage.setItem(MSKEY, msActif() ? '1' : '0'); } catch (e) {}
  }

  function rowTemplate(h, m, s, sign, ms) {
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
      '<input class="inp r-ms" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="Millisecondes" value="' + (ms === undefined ? '' : ms) + '">' +
      '<button class="row-del" type="button" aria-label="Supprimer cette ligne">×</button>';
    return d;
  }

  function buildRows(list) {
    rowsBox.innerHTML = '<div class="row-units" aria-hidden="true"><span>Ajouter / Retirer</span>' +
      '<span>Heures</span><span>Minutes</span><span>Sec.</span><span class="u-ms">Ms.</span><span></span></div>';
    (list || [[2, 30, ''], [1, 45, '']]).forEach(function (r) {
      rowsBox.appendChild(rowTemplate(r[0], r[1], r[2], r[3], r[4]));
    });
    appliquerMs();
  }

  /** Signe actif d'une ligne : '+' ou '-' */
  function rowSign(row) {
    var on = $('.sg-btn.is-on', row);
    return on && on.dataset.sign === '-' ? '-' : '+';
  }

  function sumRows() {
    var total = 0, filled = false, ms = msActif();
    $$('.row', rowsBox).forEach(function (row) {
      var sign = rowSign(row) === '-' ? -1 : 1;
      var h = parseFloat($('.r-h', row).value) || 0;
      var m = parseFloat($('.r-m', row).value) || 0;
      var s = parseFloat($('.r-s', row).value) || 0;
      var q = ms ? (parseFloat($('.r-ms', row).value) || 0) : 0;
      if ($('.r-h', row).value || $('.r-m', row).value || $('.r-s', row).value ||
          (ms && $('.r-ms', row).value)) filled = true;
      total += sign * (h * 3600 + m * 60 + s + q / 1000);
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
        var h = $('.r-h', row).value || 0, m = $('.r-m', row).value || 0,
            s = $('.r-s', row).value || 0, q = msActif() ? ($('.r-ms', row).value || 0) : 0;
        if (!+h && !+m && !+s && !+q) return '';
        return rowSign(row) + ' ' + h + 'h' + String(m).padStart(2, '0') +
               (+s || +q ? ':' + s : '') + (+q ? '.' + String(q).padStart(3, '0') : '');
      }).filter(Boolean).join(' ').replace(/^\+\s/, '');
    }

    tab1Secondes = sec;
    var ms = msActif();

    render({
      label: 'Total des durées',
      value: fmtHMS(sec, ms),
      input: input,
      cells: [
        { v: nf(sec / 3600, 2), l: 'Heures décimales' },
        { v: fmtMinutes(sec), l: 'Minutes totales' },
        { v: (ms ? nf(sec, 3) : nf(Math.round(sec))) + ' s', l: 'Secondes totales' }
      ],
      copy: fmtHMS(sec, ms) + '  (' + nf(sec / 3600, 2) + ' h décimales · ' + fmtMinutes(sec) + ')'
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
      dWe = $('#d-weekend'), dHol = $('#d-holidays'), dPays = $('#d-pays');

  var PKEY = 'cd-pays';

  /** Pays retenu pour les jours fériés. */
  function paysActif() { return codePays(dPays && dPays.value); }

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
    var work = 0, feriesDeduits = 0,
        skipWe = dWe.checked, skipHol = dHol.checked, pays = paysActif();
    for (var ts = from; ts <= to; ts += DAY_MS) {
      var wd = new Date(ts).getUTCDay();
      if (skipWe && (wd === 0 || wd === 6)) continue;
      if (skipHol && isHoliday(ts, pays)) { feriesDeduits++; continue; }
      work++;
    }

    var weeks = Math.floor(days / 7), remDays = days % 7;
    var breakdown = (y ? y + ' an' + (y > 1 ? 's' : '') + ' ' : '') + (mo ? mo + ' mois ' : '') + dd + ' j';
    var workLabel = skipWe ? (skipHol ? 'Jours ouvrés' : 'Jours hors week-end') : (skipHol ? 'Jours hors fériés' : 'Jours comptés');
    // Note volontairement constante à pays donné : y glisser le nombre de fériés
    // la ferait passer sur deux lignes selon la période, donc décaler la page (CLS).
    var note = skipHol
      ? '* bornes incluses. Jours fériés : ' + PAYS[pays].nom + '.'
      : '* bornes incluses (la date de début et la date de fin sont comptées).';

    render({
      // Libellé volontairement constant : y insérer les dates le ferait passer
      // sur deux lignes selon la largeur, ce qui décale la page (CLS).
      label: 'Écart entre deux dates',
      value: nf(days) + (days > 1 ? ' jours' : ' jour'),
      input: toFR(from) + ' → ' + toFR(to),
      cells: [
        { v: nf(work), l: workLabel + ' *' },
        { v: weeks + ' sem. ' + remDays + ' j', l: 'Semaines' },
        { v: breakdown.trim(), l: 'Détail calendaire' },
        { v: nf(days + 1), l: 'Jours inclus *' },
        { v: nf(days * 24), l: 'Heures' }
      ],
      note: note,
      copy: 'Du ' + toFR(from) + ' au ' + toFR(to) + ' : ' + nf(days) + ' jours d\'écart · ' +
            nf(days + 1) + ' jours bornes incluses · ' + nf(work) + ' ' + workLabel.toLowerCase() +
            (skipHol ? ' (' + feriesDeduits + ' férié' + (feriesDeduits > 1 ? 's' : '') +
                       ' ' + PAYS[pays].gentile + ' déduit' + (feriesDeduits > 1 ? 's' : '') + ')' : '') +
            ' · ' + breakdown.trim()
    });
  }

  /* ---------------------------------------------------------
     7 bis. Onglet 4 — Multiplier / diviser une durée
     --------------------------------------------------------- */
  var mH = $('#m-h'), mM = $('#m-m'), mS = $('#m-s'), mN = $('#m-n');

  /** Opération active : 'x' ou '/' */
  function opActif() {
    var on = $('.sign-group-op .sg-btn.is-on');
    return on && on.dataset.op === '/' ? '/' : 'x';
  }

  function calcTab4() {
    var h = parseFloat(mH.value) || 0,
        m = parseFloat(mM.value) || 0,
        sec0 = parseFloat(mS.value) || 0;
    var base = h * 3600 + m * 60 + sec0;
    var op = opActif();
    var n = parseFloat(String(mN.value).replace(',', '.'));
    var signe = op === 'x' ? '×' : '÷';

    if (!isFinite(n)) {
      return render({ label: 'Multiplier ou diviser', value: '—', idle: true,
        error: 'Indiquez par combien multiplier ou diviser.' });
    }
    if (op === '/' && n === 0) {
      return render({ label: 'Division impossible', value: '—', idle: true,
        error: 'On ne peut pas diviser par zéro.' });
    }

    var sec = op === 'x' ? base * n : base / n;
    var nAff = nf(n, Math.abs(n % 1) < 1e-9 ? 0 : 2);
    var operation = fmtHMS(base) + ' ' + signe + ' ' + nAff;

    render({
      label: op === 'x' ? 'Durée multipliée' : 'Durée divisée',
      value: fmtHMS(sec),
      input: fmtHMS(base) + ' ' + signe + ' ' + nAff,
      cells: [
        { v: nf(sec / 3600, 2), l: 'Heures décimales' },
        { v: fmtMinutes(sec), l: 'Minutes totales' },
        { v: operation, l: 'Opération' }
      ],
      copy: operation + ' = ' + fmtHMS(sec) + '  (' + nf(sec / 3600, 2) + ' h décimales)'
    });
  }

  /* ---------------------------------------------------------
     8. Onglets
     --------------------------------------------------------- */
  var current = 1;
  function compute() {
    if (current === 1) calcTab1();
    else if (current === 2) calcTab2();
    else if (current === 3) calcTab3();
    else calcTab4();
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
      var k = e.key, n = null, nb = $$('.tab').length;
      if (k === 'ArrowRight') n = (i + 1) % nb + 1;
      if (k === 'ArrowLeft') n = (i + nb - 1) % nb + 1;
      if (n) { e.preventDefault(); activate(n); $('#tab-' + n).focus(); }
    });
  });

  /* ---------------------------------------------------------
     9. Relevé local : historique, export CSV, impression
     --------------------------------------------------------- */
  // 50 lignes : de quoi couvrir un mois de saisies quotidiennes, ce qui rend
  // l'export utile. Au-delà, la liste devient illisible à l'écran.
  var HKEY = 'cd-hist', MAX_HIST = 50;
  var histBox = $('#history-box'), histList = $('#history-list'), histTimer;
  var NOM_ONGLET = { 1: 'Addition / Soustraction', 2: 'Entre 2 heures',
                     3: 'Entre 2 dates', 4: 'Multiplier / Diviser' };

  function readHist() {
    try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; }
  }
  function writeHist(a) {
    try { localStorage.setItem(HKEY, JSON.stringify(a)); } catch (e) {}
  }

  function deuxChiffres(n) { return String(n).padStart(2, '0'); }

  /** « 29/08/2026 14:32 » en heure locale. Chaîne vide si la ligne est
      antérieure à l'ajout de l'horodatage. */
  function horodatage(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    return deuxChiffres(d.getDate()) + '/' + deuxChiffres(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + deuxChiffres(d.getHours()) + ':' + deuxChiffres(d.getMinutes());
  }
  function jourISO() {
    var d = new Date();
    return d.getFullYear() + '-' + deuxChiffres(d.getMonth() + 1) + '-' + deuxChiffres(d.getDate());
  }

  function drawHist() {
    var h = readHist();
    histBox.hidden = h.length === 0;
    histList.innerHTML = h.map(function (it) {
      return '<li>' +
        '<span class="h-date">' + esc(horodatage(it.d)) + '</span>' +
        '<span class="h-in">' + esc(it.i) + '</span>' +
        '<span class="h-out">' + esc(it.o) + '</span></li>';
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
    var snap = { d: Date.now(), t: NOM_ONGLET[current] || '',
                 i: lastResult.input || '—', o: lastResult.summary };
    histTimer = setTimeout(function () {
      if (!snap.i || snap.i === '—') return;
      var h = readHist();
      if (h.length && h[0].i === snap.i && h[0].o === snap.o) return;
      h.unshift(snap);
      writeHist(h.slice(0, MAX_HIST));
      drawHist();
    }, 1600);
  }
  $('#btn-clear-hist').addEventListener('click', function () { writeHist([]); drawHist(); });

  /* ---------- Export CSV ---------- */

  /** Une valeur n'est mise entre guillemets que si elle en a besoin ; à
      l'intérieur, un guillemet se double. C'est la convention RFC 4180. */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function telecharger(texte, type, nom) {
    var url = URL.createObjectURL(new Blob([texte], { type: type }));
    var a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Libérer trop tôt annule le téléchargement sur certains navigateurs.
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function exporterCSV() {
    var h = readHist();
    if (!h.length) return showToast('Aucun calcul à exporter');

    var lignes = [['Date', 'Type de calcul', 'Opération', 'Résultat']];
    // Ordre chronologique : un relevé se lit du plus ancien au plus récent.
    h.slice().reverse().forEach(function (it) {
      lignes.push([horodatage(it.d), it.t || '', it.i || '', it.o || '']);
    });

    // Point-virgule et BOM : sans eux, Excel en français empile tout dans une
    // seule colonne et affiche les accents en charabia. Le BOM lui signale
    // l'UTF-8, le point-virgule est son séparateur par défaut en locale FR.
    var csv = '\uFEFF' + lignes.map(function (l) {
      return l.map(csvCell).join(';');
    }).join('\r\n');

    telecharger(csv, 'text/csv;charset=utf-8', 'releve-durees-' + jourISO() + '.csv');
    showToast(h.length + (h.length > 1 ? ' lignes exportées' : ' ligne exportée'));
  }

  $('#btn-csv').addEventListener('click', exporterCSV);

  /* ---------- Impression / PDF ----------
     Pas de bibliothèque PDF : jsPDF pèse plus de 300 Ko, ce qui ruinerait le
     score de performance et la promesse « aucune requête externe ». La boîte
     d'impression du navigateur propose « Enregistrer au format PDF » sur tous
     les systèmes récents, et rend un document plus propre. */
  function majEnteteImpression() {
    var n = readHist().length;
    $('#print-entete').textContent =
      'Relevé de durées — ' + n + (n > 1 ? ' calculs' : ' calcul') +
      ' — édité le ' + horodatage(Date.now()) + ' — calculatrice-duree.fr';
  }

  // Beaucoup de gens impriment par Ctrl+P sans passer par le bouton :
  // l'en-tête doit être juste dans les deux cas.
  window.addEventListener('beforeprint', majEnteteImpression);

  $('#btn-print').addEventListener('click', function () {
    if (!readHist().length) return showToast('Aucun calcul à imprimer');
    majEnteteImpression();
    window.print();
  });

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
    else if (current === 3) { setDefaultDates(); dWe.checked = true; dHol.checked = true; }
    else { mH.value = ''; mM.value = ''; mS.value = ''; mN.value = '2'; }
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
  var badgeExemple = $('#res-exemple');
  ['input', 'click'].forEach(function (ev) {
    $('#calculatrice').addEventListener(ev, function () {
      userTouched = true;
      // Le résultat s'affiche au-dessus des champs : tant que rien n'a été
      // saisi, il faut dire que c'est une démonstration, pas un calcul du
      // visiteur. L'étiquette ne revient jamais une fois retirée.
      if (badgeExemple && !badgeExemple.hidden) badgeExemple.hidden = true;
    }, true);
  });

  /* Retour au calculateur : les pages atteignent quatorze écrans sur mobile.
     Le bouton n'apparaît qu'une fois l'outil sorti de l'écran. */
  (function () {
    var lien = $('#retour-calc'), cible = $('#calculatrice');
    if (!lien || !cible || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entrees) {
      lien.classList.toggle('is-on', !entrees[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(cible);
  })();

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

  // Millisecondes : à la désactivation, les valeurs saisies sont effacées.
  // Les laisser dans des champs masqués fausserait le total sans rien montrer.
  optMs.addEventListener('change', function () {
    if (!msActif()) $$('.r-ms', rowsBox).forEach(function (i) { i.value = ''; });
    appliquerMs();
    compute();
  });

  /** Reporte le total sur la première ligne pour enchaîner les calculs :
      on cumule un mois d'heures sans ressaisir le sous-total à chaque fois. */
  function reporterTotal() {
    if (current !== 1) return showToast('Le report ne concerne que l\'addition');
    if (quick.value.trim()) quick.value = ''; // la saisie libre reprend la main sinon
    var sec = tab1Secondes;
    if (!sec) return showToast('Aucun total à reporter');

    var neg = sec < 0, abs = Math.abs(sec);
    var q = Math.round((abs - Math.floor(abs)) * 1000);
    abs = Math.floor(abs);
    if (q === 1000) { q = 0; abs += 1; }
    var h = Math.floor(abs / 3600), m = Math.floor((abs % 3600) / 60), s = abs % 60;

    buildRows([[h || '', m || '', s || '', neg ? '-' : '+', msActif() && q ? q : ''],
               ['', '', '', '+', '']]);
    compute();
    showToast('Total reporté sur la première ligne');
  }
  $('#btn-retenue').addEventListener('click', reporterTotal);

  /* Raccourcis clavier — ignorés dès qu'un champ a le focus, sinon taper « + »
     dans la saisie libre ajouterait une ligne au lieu d'écrire le signe. */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    if (a && a.isContentEditable) return;

    var k = e.key.toLowerCase();
    if (current === 1 && (e.key === '+' || e.key === '-' || e.key === '−')) {
      appendRow(e.key === '+' ? '+' : '-'); e.preventDefault(); return;
    }
    if (k === 'w') { reporterTotal(); e.preventDefault(); return; }
    if (k === 'c') { $('#btn-copy').click(); e.preventDefault(); return; }
    if (k === 'm') { $('#btn-reset').click(); e.preventDefault(); }
  });

  [hStart, hEnd, hPause].forEach(function (el) { el.addEventListener('input', compute); });
  function syncChips() {
    var v = String(parseFloat(hPause.value) || 0);
    $$('.chip').forEach(function (c) { c.classList.toggle('is-on', c.dataset.pause === v); });
  }
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () { hPause.value = c.dataset.pause; syncChips(); compute(); });
  });
  hPause.addEventListener('input', syncChips);

  [dStart, dEnd, dWe, dHol, dPays].forEach(function (el) { el.addEventListener('input', compute); });

  // Le pays choisi est retenu : un visiteur belge ne le resélectionne pas à chaque visite.
  dPays.addEventListener('change', function () {
    try { localStorage.setItem(PKEY, paysActif()); } catch (e) {}
  });

  [mH, mM, mS, mN].forEach(function (el) { el.addEventListener('input', compute); });
  $$('.sign-group-op .sg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.sign-group-op .sg-btn').forEach(function (o) {
        var on = o === btn;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      compute();
    });
  });

  /* ---------------------------------------------------------
     12. Initialisation
     --------------------------------------------------------- */
  function setDefaultDates() {
    var now = new Date();
    var t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    dStart.value = new Date(t).toISOString().slice(0, 10);
    dEnd.value = new Date(t + 30 * DAY_MS).toISOString().slice(0, 10);
  }

  /** Pays d'ouverture : celui de la page (<body data-pays>) sinon le dernier choisi. */
  function initPays() {
    var page = document.body.getAttribute('data-pays');
    if (PAYS[page]) { dPays.value = page; return; }
    try {
      var memo = localStorage.getItem(PKEY);
      if (PAYS[memo]) dPays.value = memo;
    } catch (e) {}
  }

  // Le marqueur data-ms est déjà posé par le script d'en-tête ; on aligne
  // simplement la case à cocher sur le choix mémorisé.
  try { optMs.checked = localStorage.getItem(MSKEY) === '1'; } catch (e) {}
  appliquerMs();

  $('#year').textContent = new Date().getFullYear();
  // Les lignes de départ sont déjà dans le HTML (évite tout décalage au chargement)
  if (!$('.row', rowsBox)) buildRows();
  setDefaultDates();
  initPays();
  syncChips();
  drawHist();
  // Les pages satellites indiquent l'onglet à ouvrir via <body data-tab="2">
  var onglet = parseInt(document.body.getAttribute('data-tab'), 10);
  activate(onglet >= 1 && onglet <= 4 ? onglet : 1);
})();
