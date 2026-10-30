'use strict';
// Voyage au Japon 2026 — web app hors ligne. Toutes les données viennent de trip.json.

const TZ = 'Asia/Tokyo';
const BUILD = '8fe0d06 · 30/10 05:42'; // remplacé par make_web.py
const CAT = {
  flight: ['✈️', 'Vol'], transport: ['🚆', 'Transport'], hotel: ['🏨', 'Hôtel'], sightseeing: ['⛩', 'Visite'],
  food: ['🍜', 'Repas'], aikido: ['🥋', 'Aïkido'], onsen: ['♨️', 'Onsen'], hike: ['🥾', 'Randonnée'],
  shopping: ['🛍', 'Shopping'], logistics: ['📦', 'Logistique'],
};
const SLOT = { morning: 'Matin', afternoon: 'Après-midi', evening: 'Soir' };

let T = null; // trip.json

// ---------- utilitaires ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const mapsUrl = q => 'https://maps.apple.com/?q=' + encodeURIComponent(q);

// Date « maintenant ». Pour tester : ?now=2026-10-28T09:00+09:00
function nowDate() {
  const p = new URLSearchParams(location.search).get('now');
  const d = p ? new Date(p) : new Date();
  return isNaN(d) ? new Date() : d;
}
// Date et heure au Japon, quel que soit le fuseau du téléphone.
function tokyoParts(d) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const o = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}` };
}
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

// État local (cases cochées, « résolu ») — sans bloquer si le stockage est indisponible.
const mem = {};
function load() { try { return JSON.parse(localStorage.getItem('japantrip') || '{}'); } catch (e) { return mem; } }
function getFlag(k) { return !!load()[k]; }
function setFlag(k, v) {
  const s = load(); if (v) s[k] = 1; else delete s[k];
  try { localStorage.setItem('japantrip', JSON.stringify(s)); } catch (e) { Object.assign(mem, s); }
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}
function copyText(txt) {
  const done = () => toast('Copié');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
  else fallback();
  function fallback() {
    const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copie impossible'); }
    a.remove();
  }
}

// ---------- logique du jour ----------
function currentDay(now) {
  const { date } = tokyoParts(now);
  const days = T.days;
  if (date < days[0].date) return { phase: 'before', date, days: dayDiff(date, T.trip.start) };
  if (date > days[days.length - 1].date) return { phase: 'after', date };
  // Jour du voyage (un jour sans entrée → le précédent)
  let cur = days[0];
  for (const d of days) if (d.date <= date) cur = d;
  return { phase: 'during', date, day: cur };
}
// Prochaine étape : première étape datée dont l'heure n'est pas passée (events[] déjà ordonné).
function nextEvent(day, now) {
  const { date, time } = tokyoParts(now);
  if (day.date !== date) return null;
  for (let i = 0; i < day.events.length; i++) {
    const e = day.events[i];
    if (e.time && e.time >= time) return i;
  }
  return null;
}

// ---------- briques d'affichage ----------
const hotelName = id => (T.hotels.find(h => h.id === id) || {}).name;
const cityOf = id => T.cities.find(c => c.id === id);

function timeLabel(e) {
  if (!e.time) return SLOT[e.slot] || '';
  let s = (e.approx ? '~' : '') + e.time;
  if (e.endTime) s += '–' + e.endTime;
  return s;
}
function mapBtn(q, label = 'Ouvrir dans Plans') {
  return q ? `<a class="btn" href="${esc(mapsUrl(q))}">🗺 ${label}</a>` : '';
}
function eventRow(day, e, i, isNext) {
  const [icon, name] = CAT[e.category] || ['•', ''];
  const key = `done:${day.date}:${i}`;
  const done = getFlag(key);
  const meta = [e.duration, e.cost].filter(Boolean).map(esc).join(' · ');
  return `<div class="ev cat-${esc(e.category)} ${e.optional ? 'opt' : ''} ${done ? 'done' : ''}">
    <div class="t">${esc(timeLabel(e))}</div>
    <div class="b">
      <div class="ttl"><span aria-hidden="true">${icon}</span> ${esc(e.title)}
        ${e.optional ? '<span class="pill">Optionnel</span>' : ''}</div>
      ${e.detail ? `<p class="muted">${esc(e.detail)}</p>` : ''}
      ${(e.rules || []).map(s => `<details class="rules"><summary>${esc(s.title)}</summary><ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`).join('')}
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      ${e.mapQuery ? `<div class="row">${mapBtn(e.mapQuery)}</div>` : ''}
    </div>
    <label class="chk"><input type="checkbox" data-flag="${key}" ${done ? 'checked' : ''} aria-label="Fait : ${esc(e.title)}"></label>
  </div>`;
}
// Carte schématique hors ligne : points lat/lon projetés en SVG (pas de tuiles, pas de dépendance).
function routeMap(m) {
  const pts = Object.fromEntries(m.points.map(p => [p.id, p]));
  const all = m.points.concat((m.lake || []).map(([lat, lon]) => ({ lat, lon })));
  const lat0 = all.reduce((s, p) => s + p.lat, 0) / all.length;
  const kx = Math.cos(lat0 * Math.PI / 180);
  const minX = Math.min(...all.map(p => p.lon * kx)), maxX = Math.max(...all.map(p => p.lon * kx));
  const minY = Math.min(...all.map(p => -p.lat)), maxY = Math.max(...all.map(p => -p.lat));
  const W = 340, pad = 22, s = (W - 2 * pad) / (maxX - minX), H = Math.round((maxY - minY) * s + 2 * pad);
  const xy = p => [((p.lon * kx - minX) * s + pad).toFixed(1), ((-p.lat - minY) * s + pad).toFixed(1)];
  const STYLE = {
    walk: 'stroke="var(--ok)" stroke-width="3.5"',
    ropeway: 'stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="6 4"',
    boat: 'stroke="var(--info)" stroke-width="2.5" stroke-dasharray="2 5" stroke-linecap="round"'
  };
  let svg = '';
  if (m.lake) svg += `<polygon points="${m.lake.map(([lat, lon]) => xy({ lat, lon }).join(',')).join(' ')}" fill="var(--info)" fill-opacity=".14" stroke="var(--info)" stroke-opacity=".35"/>`;
  for (const l of m.legs)
    svg += `<polyline points="${l.path.map(id => xy(pts[id]).join(',')).join(' ')}" fill="none" stroke-linejoin="round" ${STYLE[l.mode] || ''}/>`;
  for (const p of m.points.filter(p => p.name)) {
    const [x, y] = xy(p);
    const [dx, dy, anchor] = { l: [-9, 4, 'end'], t: [0, -10, 'middle'] }[p.label] || [9, 4, 'start'];
    svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--card)" stroke="var(--text)" stroke-width="2"/>` +
      `<text x="${+x + dx}" y="${+y + dy}" text-anchor="${anchor}" class="maplbl">${esc(p.name)}</text>`;
  }
  const legend = [['walk', '🥾 À pied'], ['ropeway', '🚡 Téléphérique'], ['boat', '⛴ Bateau']]
    .filter(([k]) => m.legs.some(l => l.mode === k)).map(([k, t]) => `<span class="lg lg-${k}">${t}</span>`).join('');
  return `<h2>${esc(m.title)}</h2><div class="card">
    <svg class="routemap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.title)}">${svg}</svg>
    <div class="legend">${legend}</div>
    ${m.note ? `<p class="muted">${esc(m.note)}</p>` : ''}
    ${(m.directions || []).map(d => `<div class="row"><a class="btn" href="${esc('https://maps.apple.com/?saddr=' + encodeURIComponent(d.from) + '&daddr=' + encodeURIComponent(d.to) + '&dirflg=' + (d.mode || 'w'))}">🗺 ${esc(d.label)}</a></div>`).join('')}
  </div>`;
}
function dayView(day, now, opts = {}) {
  const idx = T.days.indexOf(day);
  const prev = T.days[idx - 1], next = T.days[idx + 1];
  const ni = opts.live ? nextEvent(day, now) : null;
  const hotel = hotelName(day.overnightHotel);
  let h = `<h1>${esc(day.label)}</h1><p class="muted">${esc(day.title)}</p>`;
  if (hotel) h += `<p class="muted">🏨 Nuit : ${esc(hotel)}</p>`;
  if (day.images && day.images.length)
    h += `<div class="carousel">${day.images.map(i => `<img src="img/${esc(i)}" alt="" loading="lazy">`).join('')}</div>`;
  h += (day.alerts || []).map(a => `<div class="alert">⚠️ ${esc(a)}</div>`).join('');
  h += weatherCard(day);
  if (ni !== null) {
    const e = day.events[ni];
    h += `<div class="card next"><div class="lbl">Prochaine étape</div>
      <h2 style="margin:4px 0">${esc(timeLabel(e))} · ${esc(e.title)}</h2>
      ${e.detail ? `<p class="muted">${esc(e.detail)}</p>` : ''}
      ${e.mapQuery ? `<div class="row">${mapBtn(e.mapQuery)}</div>` : ''}</div>`;
  }
  if (T.hike && T.hike.date === day.date)
    h += `<div class="row"><a class="btn primary" href="#/hike">🥾 Fiche randonnée</a></div>`;
  h += `<h2>Chronologie</h2><div class="card">${day.events.map((e, i) => eventRow(day, e, i, i === ni)).join('') || '<p class="muted">Rien de prévu.</p>'}</div>`;
  if (day.map) h += routeMap(day.map);
  h += `<div class="nav2">
    ${prev ? `<a class="btn" href="#/day/${prev.date}">← Jour précédent</a>` : '<span></span>'}
    ${next ? `<a class="btn" href="#/day/${next.date}">Jour suivant →</a>` : ''}</div>`;
  return h;
}
function verifyBanner() {
  const n = T.toVerify.filter(v => !getFlag('res:' + v.id)).length;
  return n ? `<a class="banner" href="#/verify">⚠️ ${n} point${n > 1 ? 's' : ''} à vérifier</a>` : '';
}


// ---------- météo (Open-Meteo, sans clé ; dernière prévision gardée pour le hors ligne) ----------
const WMO = [
  [[0], '☀️', 'Ensoleillé'], [[1], '🌤', 'Plutôt dégagé'], [[2], '⛅', 'Éclaircies'], [[3], '☁️', 'Couvert'],
  [[45, 48], '🌫', 'Brouillard'], [[51, 53, 55, 56, 57], '🌦', 'Bruine'], [[61, 63, 80, 81], '🌧', 'Pluie'],
  [[65, 66, 67, 82], '🌧', 'Forte pluie'], [[71, 73, 75, 77, 85, 86], '❄️', 'Neige'], [[95, 96, 99], '⛈', 'Orage'],
];
const wmo = c => { const w = WMO.find(x => x[0].includes(c)); return w ? [w[1], w[2]] : ['🌡', 'Météo']; };
let WX = (() => { try { return JSON.parse(localStorage.getItem('japantrip-wx') || '{}'); } catch (e) { return {}; } })();

function wxFor(day) {
  const city = cityOf(day.city);
  return city && WX.cities && WX.cities[city.id] && WX.cities[city.id][day.date];
}
function weatherCard(day) {
  if (!day.city) return '';
  const w = wxFor(day);
  if (!w) return `<div class="card wx" data-wx="${day.date}"><span class="muted">🌡 Météo ${esc(cityOf(day.city).name)} : prévisions disponibles ~15 jours avant.</span></div>`;
  const [icon, label] = wmo(w.code);
  const upd = WX.fetched ? new Date(WX.fetched).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ }) : '';
  return `<div class="card wx" data-wx="${day.date}">
    <div class="wxi" aria-hidden="true">${icon}</div>
    <div><strong>${esc(label)}</strong> · ${Math.round(w.max)}° / ${Math.round(w.min)}°
      <div class="muted">${esc(cityOf(day.city).name)}${w.rain != null ? ` · pluie ${w.rain} %` : ''}${upd ? ` · maj ${upd}` : ''}</div></div></div>`;
}
function refreshWeather() {
  if (!navigator.onLine) return;
  const out = { fetched: Date.now(), cities: {} };
  const jobs = T.cities.filter(c => c.lat != null).map(c =>
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      `&timezone=${encodeURIComponent(TZ)}&forecast_days=16`)
      .then(r => r.json()).then(j => {
        const m = {}, d = j.daily;
        d.time.forEach((t, i) => {
          if (d.weather_code[i] != null) m[t] = { code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_probability_max[i] };
        });
        out.cities[c.id] = m;
      }).catch(() => { out.cities[c.id] = (WX.cities && WX.cities[c.id]) || {}; }));
  Promise.all(jobs).then(() => {
    // Conserve les jours déjà connus (une prévision passée reste affichable hors ligne).
    for (const id in out.cities) out.cities[id] = Object.assign({}, WX.cities && WX.cities[id], out.cities[id]);
    WX = out;
    try { localStorage.setItem('japantrip-wx', JSON.stringify(WX)); } catch (e) {}
    document.querySelectorAll('.wx[data-wx]').forEach(el => {
      const day = T.days.find(d => d.date === el.dataset.wx);
      if (day) el.outerHTML = weatherCard(day);
    });
  });
}

// ---------- écrans ----------
function viewToday() {
  const now = nowDate();
  const st = currentDay(now);
  if (st.phase === 'before') {
    const d0 = T.days[0];
    return `<div class="hero" style="background-image:linear-gradient(transparent 40%,rgba(0,0,0,.55)),url(img/${esc(T.trip.cover)})"><span></span></div>
      <div class="card" style="text-align:center"><div class="count">${st.days}</div><p>jour${st.days > 1 ? 's' : ''} avant le départ</p></div>
      ${verifyBanner()}
      <h2>Premier jour</h2><div class="card"><h3>${esc(d0.label)}</h3><p class="muted">${esc(d0.title)}</p>
      <div class="row"><a class="btn primary" href="#/day/${d0.date}">Voir le programme</a></div></div>
      <footer>良い旅を！</footer>`;
  }
  if (st.phase === 'after')
    return `<div class="hero" style="background-image:linear-gradient(transparent 40%,rgba(0,0,0,.55)),url(img/${esc(T.trip.cover)})"><span></span></div>
      <div class="card" style="text-align:center"><h1>${esc(T.trip.farewell)}</h1></div>`;
  return verifyBanner() + dayView(st.day, now, { live: true }) + '<footer>良い旅を！</footer>';
}
function viewDay(date) {
  const day = T.days.find(d => d.date === date);
  if (!day) return '<p>Jour introuvable.</p>';
  const now = nowDate();
  return `<p><a href="#/program">← Programme</a></p>` + dayView(day, now, { live: tokyoParts(now).date === date }) + '';
}
function viewProgram() {
  let h = '<h1>Programme</h1>';
  let last = '__';
  for (const d of T.days) {
    const key = d.city || '';
    if (key !== last) {
      const c = cityOf(d.city);
      if (c) h += `<div class="hero city" style="height:110px;background-image:linear-gradient(transparent 30%,rgba(0,0,0,.6)),url(img/${esc(c.image)})"><span>${esc(c.name)} · ${esc(c.dates)}</span></div><p class="muted">${esc(c.baseNote || '')}</p>`;
      else h += `<h2 class="city">Départ</h2>`;
      h += '<div class="card list">';
      last = key;
    }
    const hotel = hotelName(d.overnightHotel);
    h += `<a class="item" href="#/day/${d.date}"><strong>${esc(d.label)}</strong><br>${esc(d.title)}${hotel ? `<br><span class="muted">🏨 ${esc(hotel)}</span>` : ''}</a>`;
    const nxt = T.days[T.days.indexOf(d) + 1];
    if (!nxt || (nxt.city || '') !== key) h += '</div>';
  }
  return h + '<footer>良い旅を！</footer>';
}
const fdate = s => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
function viewInfo() {
  let h = `<h1>Infos pratiques</h1>${verifyBanner()}<h2>Vols</h2>`;
  h += `<div class="card"><p>Référence de dossier : <strong>${esc(T.trip.bookingRef)}</strong></p>
    <div class="row"><button class="btn" data-copy="${esc(T.trip.bookingRef)}">📋 Copier la référence</button></div></div>`;
  for (const f of T.flights)
    h += `<div class="card"><h3>${esc(f.airline)} ${esc(f.number)}</h3>
      <p>${esc(f.from.city)} (${esc(f.from.code)}) → ${esc(f.to.city)} (${esc(f.to.code)})</p>
      <p class="muted">Départ ${fdate(f.departure.date)} ${esc(f.departure.time)} · Arrivée ${fdate(f.arrival.date)} ${esc(f.arrival.time)} <br>(heures locales)</p></div>`;
  h += '<h2>Hôtels</h2>';
  for (const x of T.hotels)
    h += `<div class="card"><h3>${esc(x.name)}</h3><p class="muted">${esc(x.area)} · ${x.nights} nuit${x.nights > 1 ? 's' : ''}<br>
      Arrivée ${fdate(x.checkIn.date)} ${esc(x.checkIn.time)} · Départ ${fdate(x.checkOut.date)} ${esc(x.checkOut.time)}</p>
      <div class="row">${mapBtn(x.mapQuery, 'Plans')}<button class="btn" data-copy="${esc(x.name)}">📋 Copier le nom</button></div></div>`;
  if (T.hike)
    h += `<h2>Randonnée</h2><div class="card"><h3>${esc(T.hike.title)}</h3><p class="muted">${fdate(T.hike.date)}</p>
      <div class="row"><a class="btn primary" href="#/hike">🥾 Ouvrir la fiche</a></div></div>`;
  if (T.attention.length) {
    h += '<h2>Points d\'attention</h2>';
    for (const a of T.attention) h += `<div class="alert"><strong>${esc(a.title)}</strong><br>${esc(a.text)}</div>`;
  }
  h += `<h2>Version de l'app</h2><div class="card"><p class="muted">Version ${esc(BUILD)}. Si une mise à jour n'apparaît pas, force le rechargement (nécessite du réseau).</p>
    <div class="row"><button class="btn" id="force-update">🔄 Forcer la mise à jour</button></div></div>`;
  h += `<h2>Rappels</h2><div class="card"><p class="muted">Ajoute les ${T.notifications.length} rappels (aux heures du Japon) à l'app Calendrier de l'iPhone : ils sonnent même hors ligne.</p>
    <div class="row"><a class="btn primary" href="rappels.ics">📅 Ajouter les rappels</a></div></div>`;
  return h;
}
function viewLuggage() {
  const k = T.takkyubin;
  let h = `<h1>Bagages · Takkyubin</h1><div class="card"><p>${esc(k.info)}</p></div>`;
  if (k.keyNote) h += `<div class="alert">${esc(k.keyNote)}</div>`;
  h += '<div class="alert">🎒 Toujours garder un sac cabine pour la nuit et le lendemain matin.</div>';
  for (const s of k.shipments) {
    const key = 'ship:' + s.id, on = getFlag(key);
    h += `<div class="card" ${s.key ? 'style="border:2px solid var(--accent)"' : ''}>
      <div class="ev" style="border:0;padding:0"><div class="b">
        <h3>${s.key ? '★ ' : ''}${esc(s.when.label)} ${s.toVerify ? '<span class="pill warn">à confirmer</span>' : ''}</h3>
        <p>${esc(s.from)} → ${esc(s.to)}</p>
        <p class="muted">Livraison : ${esc(s.delivery.label)}<br>${esc(s.why)}</p></div>
        <label class="chk" style="width:auto;gap:6px"><input type="checkbox" data-flag="${key}" ${on ? 'checked' : ''}> Envoyé</label></div></div>`;
  }
  return h;
}
function viewHike() {
  const k = T.hike;
  if (!k) return viewToday();
  const day = T.days.find(d => d.date === k.date);
  let h = `<h1>${esc(k.title)}</h1><p class="muted">${fdate(k.date)} · ${esc(k.summary)}</p>`;
  if (day) h += weatherCard(day) + `<div class="row"><a class="btn" href="#/day/${day.date}">📅 Programme heure par heure</a></div>`;
  h += `<div class="card"><table>${k.facts.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table></div>`;
  if (day && day.map) h += routeMap(day.map);
  h += `<h2>Tronçons et billets</h2><div class="card"><table><tr><th></th><th>Trajet</th><th>Durée</th><th>Prix</th></tr>
    ${k.segments.map(s => `<tr><td aria-hidden="true">${esc(s.mode)}</td><td>${esc(s.what)}</td><td>${esc(s.time)}</td><td>${esc(s.price)}</td></tr>`).join('')}</table></div>`;
  h += `<div class="alert">🎫 ${esc(k.tickets)}</div>`;
  h += `<h2>Horaires clés</h2><div class="card"><table>${k.keyTimes.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table></div>`;
  h += `<h2>Météo et tenue</h2><div class="card"><p>${esc(k.weather)}</p></div>`;
  h += `<h2>À emporter</h2><div class="card">${k.packing.map((t, i) => {
    const key = `pack:${k.date}:${i}`;
    return `<label class="pack"><input type="checkbox" data-flag="${key}" ${getFlag(key) ? 'checked' : ''}> ${esc(t)}</label>`;
  }).join('')}</div>`;
  h += `<h2>Plans de secours</h2>${k.fallbacks.map(f => `<details class="card rules"><summary>${esc(f.title)}</summary><p>${esc(f.text)}</p></details>`).join('')}`;
  if (k.sources) h += `<p class="muted">Sources : ${k.sources.map(([t, u]) => `<a href="${esc(u)}">${esc(t)}</a>`).join(' · ')}</p>`;
  return h;
}
function viewAikido() {
  const a = T.aikido, d = a.dojo;
  let h = `<h1>Aïkido</h1><div class="card"><h3>${esc(d.name)}</h3>
    <p>${esc(d.address)}</p><p class="muted">Station : ${esc(d.nearestStation)}</p>
    <div class="row">${mapBtn(d.mapQuery, 'Plans')}
      <button class="btn" data-copy="${esc(d.address)}">📋 Copier l'adresse</button>
      <a class="btn" href="tel:${esc(d.phone.replace(/[^+\d]/g, ''))}">📞 ${esc(d.phone)}</a>
      <a class="btn" href="${esc(d.website)}">🌐 Site</a></div></div>`;
  if (a.routeFromHotel) {
    h += `<h2>Trajet depuis l'hôtel</h2><div class="card"><p class="muted">${esc(a.routeFromHotel.from)} · ${esc(a.routeFromHotel.duration)}</p><ol>`;
    for (const s of a.routeFromHotel.steps)
      h += `<li>${esc(s.line)} : ${esc(s.from)} → ${esc(s.to)} <span class="muted">(${esc(s.duration)})</span></li>`;
    h += '</ol></div>';
  }
  h += '<h2>Cours</h2><div class="card"><table><tr><th>Date</th><th>Heure</th><th>Enseignant</th></tr>';
  for (const c of a.classes)
    h += `<tr class="${c.highlight ? 'hl' : ''}"><td>${fdate(c.date)}</td><td>${esc(c.time)}</td><td>${esc(c.teacher)}${c.note ? `<br><span class="muted">${esc(c.note)}</span>` : ''}</td></tr>`;
  h += '</table></div>';
  if (a.warning) h += `<div class="alert">${esc(a.warning)}</div>`;
  if (a.rules) {
    h += `<h2>${esc(a.rules.title)}</h2><p class="muted">${esc(a.rules.intro)}</p>`;
    for (const s of a.rules.sections)
      h += `<details class="card rules"><summary>${esc(s.title)}</summary><ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`;
    h += `<p class="muted">Sources : ${a.rules.sources.map(s => `<a href="${esc(s[1])}">${esc(s[0])}</a>`).join(' · ')}</p>`;
  }
  return h;
}
function viewVerify() {
  let h = '<p><a href="#/today">← Retour</a></p><h1>À vérifier</h1><p class="muted">Incohérences relevées dans le dossier d\'origine.</p>';
  for (const v of T.toVerify) {
    const key = 'res:' + v.id, on = getFlag(key);
    h += `<div class="card" ${on ? 'style="opacity:.6"' : ''}>
      <h3 class="sev-${esc(v.severity)}">${v.severity === 'high' ? '● ' : '○ '}${esc(v.title)}</h3>
      <p>${esc(v.text)}</p>
      <div class="row">${(v.dates || []).map(d => `<a class="btn" href="#/day/${d}">${fdate(d)}</a>`).join('')}
        <label class="btn"><input type="checkbox" data-flag="${key}" ${on ? 'checked' : ''}>&nbsp;Résolu</label></div></div>`;
  }
  return h;
}

// ---------- routeur ----------
function render() {
  const hash = location.hash.replace(/^#\/?/, '') || 'today';
  const [route, arg] = hash.split('/');
  const views = { today: viewToday, program: viewProgram, info: viewInfo, luggage: viewLuggage, aikido: viewAikido, verify: viewVerify, hike: viewHike };
  const html = route === 'day' ? viewDay(arg) : (views[route] || viewToday)();
  $('#app').innerHTML = html;
  const tab = { day: 'program', verify: 'today', hike: 'program' }[route] || route;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  window.scrollTo(0, 0);
}

document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.flag;
  if (!k) return;
  setFlag(k, e.target.checked);
  const row = e.target.closest('.ev');
  if (row && k.startsWith('done:')) row.classList.toggle('done', e.target.checked);
});
document.addEventListener('click', e => {
  if (e.target.closest('#force-update')) {
    const go = () => location.reload();
    (navigator.serviceWorker ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]))
      .then(rs => Promise.all(rs.map(r => r.unregister())))
      .then(() => window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : null)
      .then(go, go);
    return;
  }
  const b = e.target.closest('[data-copy]');
  if (b) copyText(b.dataset.copy);
});
window.addEventListener('hashchange', render);

fetch('trip.json').then(r => r.json()).then(j => {
  T = j; render(); refreshWeather();
  // « Aujourd'hui » se recalcule quand l'app revient au premier plan.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (location.hash === '' || location.hash === '#/today')) render();
  });
}).catch(() => { $('#app').innerHTML = '<p>Impossible de charger les données du voyage.</p>'; });

if ('serviceWorker' in navigator) {
  // Nouvelle version installée : recharger une fois pour l'afficher.
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
