'use strict';
// Bermuda insurer peer comparison: a static page. data/peers.json and data/top_issuers.json
// come from bma-peer-compare/pipeline/export_share.py. This small runtime loads them, works
// out the summary tables (dash.calc) and redraws whatever reads them (dash.draw).
const dash = (() => {
  const store = {};
  const calcs = [];
  const drawers = {};
  const colorVars = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
  return {
    colors: colorVars.map((v) => `var(${v})`),
    data(name) { return name in store ? { status: 'ok', data: store[name] } : { status: 'loading', data: null }; },
    calc(name, spec) { calcs.push([name, spec]); },
    draw(name, fn) {
      if (fn) { drawers[name] = fn; return; }
      const f = drawers[name];
      if (!f) return;
      for (const n of document.querySelectorAll(`[data-draw="${name}"]`)) f(n);
    },
    drawAll() { Object.keys(drawers).forEach((n) => this.draw(n)); },
    setLink(name) { try { history.replaceState(null, '', `#${name}`); } catch (e) { /* file:// or sandboxed */ } },
    async load(files) {
      const got = await Promise.all(Object.entries(files).map(async ([name, url]) => {
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return [name, await r.json()];
      }));
      for (const [name, rows] of got) store[name] = rows;
      for (const [name, spec] of calcs) store[name] = spec.fn(...spec.inputs.map((i) => store[i]));
    },
  };
})();
const BACKINGS = ['PE / alternative', 'Hybrid', 'Traditional insurer', 'Bank / other', 'Unknown'];
const MIN_SIZE = 1e8;
const GROUPS = [['gov', 'Government and agency'], ['corp', 'Corporate bonds'], ['priv', 'Private credit and loans'], ['struct', 'Structured credit'], ['mort', 'Mortgages'], ['eq', 'Equity and alternatives'], ['cash', 'Cash and short-term'], ['other', 'Other invested']];

const fUsd = (v) => {
  if (v == null) return '–';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(a >= 1e11 ? 0 : 1)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const fPct = (v) => (v == null ? '–' : `${(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`);
const fX = (v) => (v == null ? '–' : `${v.toFixed(2)}x`);
const fY = (v) => (v == null ? '–' : `${v.toFixed(1)} yrs`);
const fD = (v) => (v == null ? '–' : v.toFixed(2));
const fY2 = (v) => (v == null ? '–' : `${(v * 100).toFixed(2)}%`);
const fInt = (v) => (v == null ? '–' : Math.round(v).toLocaleString('en-US'));
const fLtv = (v) => (v == null ? '–' : `${v.toFixed(0)}%`);
const FMT = { usd: fUsd, pct: fPct, int: fInt };

const M = {
  invested: ['Invested assets', fUsd], net_res: ['Net reserves', fUsd], cover: ['Invested / net reserves', fX],
  gov: ['Government and agency', fPct], corp: ['Corporate bonds', fPct], priv: ['Private credit and loans', fPct], struct: ['Structured credit', fPct], mort: ['Mortgages', fPct], eq: ['Equity and alternatives', fPct], cash: ['Cash and short-term', fPct], other: ['Other invested', fPct],
  below_ig: ['Below investment grade', fPct], unrated: ['Unrated', fPct], w_rating: ['Average BSCR rating', fD], yield: ['Market yield', fY2],
  illiquid: ['Private and illiquid', fPct], lvl3: ['Level 3', fPct], asset_dur: ['Asset duration', fY], res_dur: ['Reserve duration', fY], gap: ['Duration gap', fY], deriv: ['Derivative notional / invested', fX],
  top10: ['Top 10 issuers', fPct], affil: ['Affiliated', fPct], non_usd: ['Non-USD assets', fPct], non_us: ['Non-US assets', fPct], trust: ['Held via trust', fPct],
  cml_ltv: ['Commercial mortgage LTV', fLtv], cml_office: ['Office share of commercial', fPct], cml_delinq: ['Commercial delinquent', fPct], rml_delinq: ['Residential delinquent', fPct],
};
const VIEWS = {
  Overview: ['invested', 'net_res', 'cover', 'below_ig', 'illiquid', 'affil', 'top10', 'gap', 'yield'],
  Allocation: ['invested', 'gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash', 'other'],
  Credit: ['invested', 'below_ig', 'unrated', 'w_rating', 'yield', 'top10'],
  Liquidity: ['invested', 'illiquid', 'lvl3', 'cover', 'asset_dur', 'res_dur', 'gap', 'deriv'],
  Concentration: ['invested', 'top10', 'affil', 'non_usd', 'non_us', 'trust'],
  Mortgages: ['invested', 'mort', 'cml_ltv', 'cml_office', 'cml_delinq', 'rml_delinq'],
};
const STRIP_ROWS = [['Asset mix', ['gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash']], ['Credit', ['below_ig', 'unrated', 'yield']], ['Liquidity and duration', ['illiquid', 'lvl3', 'cover', 'asset_dur', 'gap']], ['Concentration', ['top10', 'affil', 'non_usd']]];
const SBS_ROWS = [['Size', ['invested', 'net_res', 'cover']], ['Asset mix', ['gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash', 'other']], ['Credit', ['below_ig', 'unrated', 'w_rating', 'yield']], ['Liquidity and duration', ['illiquid', 'lvl3', 'asset_dur', 'res_dur', 'gap', 'deriv']], ['Concentration', ['top10', 'affil', 'non_usd', 'non_us', 'trust']], ['Mortgages', ['cml_ltv', 'cml_office', 'cml_delinq', 'rml_delinq']]];
const SIZE = { all: [0, Infinity], lt1: [0, 1e9], '1-5': [1e9, 5e9], '5-25': [5e9, 25e9], '25+': [25e9, Infinity] };

const S = { tab: 'backing', level: 'entity', backing: 'all', cls: 'all', basis: 'all', size: 'all', view: 'Overview', q: '', min: true, sort: 'invested', dir: -1, strip: 'illiquid', mapX: 'below_ig', mapY: 'yield', company: null, peerSet: 'same', stat: 'median', sbs: null };
const SBS_MAX = 10;
const SETS = ['All', ...BACKINGS];
const setLabel = (s) => (s === 'All' ? 'All companies' : `All ${s}`);

const median = (a) => { const v = a.filter((x) => x != null).sort((p, q) => p - q); if (!v.length) return null; const m = v.length / 2; return v.length % 2 ? v[Math.floor(m)] : (v[m - 1] + v[m]) / 2; };
const enc = (v) => String(v).replace(/[%&=]/g, encodeURIComponent);
const el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) { if (k === 'style') n.style.cssText = v; else n.setAttribute(k, v); }
  n.append(...kids.filter((k) => k != null));
  return n;
};
const peers = () => { const d = dash.data('peers'); return d.status === 'ok' ? d.data : null; };
const backColor = (b) => (b === 'Unknown' ? 'var(--cds-chart-muted)' : dash.colors[BACKINGS.indexOf(b)] || 'var(--cds-chart-muted)');
const firstBacking = (u) => BACKINGS.find((b) => (u.backing || '').includes(b)) || 'Unknown';
const pick = (where, rows) => rows.find(where);
const mark = (tag, source, field, where, text, extra) => el(tag, { 'data-source': source, 'data-field': field, 'data-where': where, ...(extra || {}) }, text);

function tooltip(box) {
  const t = el('div', { class: 'bx-tip', hidden: '' });
  box.append(t);
  return {
    show(ev, text) {
      t.textContent = text; t.hidden = false;
      const b = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(ev.clientX - b.left + 12, b.width - t.offsetWidth));
      const y = Math.max(0, Math.min(ev.clientY - b.top + 12, b.height - t.offsetHeight));
      t.style.left = `${x}px`; t.style.top = `${y}px`;
    },
    hide() { t.hidden = true; },
  };
}

function shown() {
  const rows = peers() || [];
  const term = S.q.trim().toLowerCase();
  const [lo, hi] = SIZE[S.size];
  return rows.filter((u) => {
    if (u.level !== S.level) return false;
    if (S.cls !== 'all' && !u.class.includes(S.cls)) return false;
    if (S.basis !== 'all' && !u.basis.includes(S.basis)) return false;
    if (S.backing === 'alt+hybrid' ? !(u.backing.includes('PE / alternative') || u.backing.includes('Hybrid')) : S.backing !== 'all' && !u.backing.includes(S.backing)) return false;
    const inv = u.invested || 0;
    if (inv < lo || inv >= hi) return false;
    if (S.min && inv < MIN_SIZE) return false;
    return !term || u.name.toLowerCase().includes(term);
  });
}
const entities = () => (peers() || []).filter((u) => u.level === 'entity').sort((a, b) => (b.invested || 0) - (a.invested || 0));

function openTab(name) {
  S.tab = name;
  for (const p of document.querySelectorAll('[data-page]')) p.hidden = p.dataset.page !== name;
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === name));
  dash.setLink(name);
  // charts size themselves to their box, which has no width while its tab is hidden
  ['mix', 'strip', 'map'].forEach((n) => dash.draw(n));
}
function openCompany(id) {
  S.company = id;
  openTab('company');
  for (const n of ['co-pick', 'co-head', 'co-strip', 'co-issuers']) dash.draw(n);
}
const REDRAW = ['league', 'map', 'shown', 'strip', 'co-strip', 'sbs'];
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => openTab(b.dataset.tab));
for (const c of document.querySelectorAll('[data-state]')) c.addEventListener('change', () => {
  const k = c.dataset.state;
  S[k] = c.value;
  for (const o of document.querySelectorAll(`[data-state="${k}"]`)) if (o !== c) o.value = c.value;
  REDRAW.forEach((n) => dash.draw(n));
});
for (const c of document.querySelectorAll('#f-search')) c.addEventListener('input', () => { S.q = c.value; ['league', 'map', 'shown'].forEach((n) => dash.draw(n)); });
for (const c of document.querySelectorAll('#f-min')) c.addEventListener('change', () => { S.min = c.checked; ['league', 'map', 'shown'].forEach((n) => dash.draw(n)); });
const opening = location.hash.slice(1);
if (document.querySelector(`[data-tab="${CSS.escape(opening)}"]`)) openTab(opening);

dash.calc('totals', {
  inputs: ['peers'], title: 'Totals across companies', description: 'Counts legal entities and adds up their invested assets and positions.',
  fn: (peers) => {
    const e = peers.filter((u) => u.level === 'entity');
    return [{ companies: e.length, invested: e.reduce((s, u) => s + (u.invested || 0), 0), positions: e.reduce((s, u) => s + (u.positions || 0), 0) }];
  },
});

dash.calc('by_backing', {
  inputs: ['peers'], title: 'Medians by backing', description: 'For legal entities with at least $100M invested: count, total, median of each measure and dollar-weighted asset mix.',
  fn: (peers) => {
    const med = (a) => { const v = a.filter((x) => x != null).sort((p, q) => p - q); if (!v.length) return null; const m = v.length / 2; return v.length % 2 ? v[Math.floor(m)] : (v[m - 1] + v[m]) / 2; };
    const base = peers.filter((u) => u.level === 'entity' && (u.invested || 0) >= 1e8);
    const row = (backing, rows) => {
      const r = { backing, companies: rows.length, invested: rows.reduce((s, u) => s + u.invested, 0) };
      for (const k of ['below_ig', 'illiquid', 'priv', 'struct', 'affil', 'top10', 'gap', 'yield']) r[k] = med(rows.map((u) => u[k]));
      for (const k of ['gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash', 'other']) {
        const known = rows.filter((u) => u[k] != null);
        const total = known.reduce((s, u) => s + u.invested, 0);
        r[`mix_${k}`] = total ? known.reduce((s, u) => s + u[k] * u.invested, 0) / total : null;
      }
      return r;
    };
    const out = ['PE / alternative', 'Hybrid', 'Traditional insurer', 'Bank / other', 'Unknown'].map((b) => row(b, base.filter((u) => u.backing === b)));
    out.push(row('All companies', base));
    return out;
  },
});

dash.calc('peer_stats', {
  inputs: ['peers'], title: 'Peer ranges by measure', description: 'For legal entities with at least $100M invested: lowest, lower quartile, median, upper quartile and highest of each measure, for all companies and for each backing.',
  fn: (peers) => {
    const base = peers.filter((u) => u.level === 'entity' && (u.invested || 0) >= 1e8);
    const metrics = ['gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash', 'below_ig', 'unrated', 'yield', 'illiquid', 'lvl3', 'cover', 'asset_dur', 'gap', 'top10', 'affil', 'non_usd'];
    const q = (v, p) => { const i = (v.length - 1) * p, lo = Math.floor(i); return lo === i ? v[lo] : v[lo] + (v[lo + 1] - v[lo]) * (i - lo); };
    const out = [];
    for (const set of ['All', 'PE / alternative', 'Hybrid', 'Traditional insurer', 'Bank / other', 'Unknown']) {
      const rows = set === 'All' ? base : base.filter((u) => u.backing === set);
      for (const metric of metrics) {
        const v = rows.map((u) => u[metric]).filter((x) => x != null).sort((a, b) => a - b);
        out.push(v.length ? { peer_set: set, metric, n: v.length, low: v[0], p25: q(v, 0.25), median: q(v, 0.5), mean: v.reduce((s, x) => s + x, 0) / v.length, p75: q(v, 0.75), high: v[v.length - 1] } : { peer_set: set, metric, n: 0, low: null, p25: null, median: null, mean: null, p75: null, high: null });
      }
    }
    return out;
  },
});

dash.calc('group_stats', {
  inputs: ['peers'], title: 'Backing group profiles', description: 'For legal entities with at least $100M invested, for all companies and for each backing: count, total invested assets and net reserves, and the median and mean company for every other measure.',
  fn: (peers) => {
    const base = peers.filter((u) => u.level === 'entity' && (u.invested || 0) >= 1e8);
    const keys = ['cover', 'gov', 'corp', 'priv', 'struct', 'mort', 'eq', 'cash', 'other', 'below_ig', 'unrated', 'w_rating', 'yield', 'illiquid', 'lvl3', 'asset_dur', 'res_dur', 'gap', 'deriv', 'top10', 'affil', 'non_usd', 'non_us', 'trust', 'cml_ltv', 'cml_office', 'cml_delinq', 'rml_delinq'];
    const med = (a) => { const v = a.filter((x) => x != null).sort((p, q) => p - q); if (!v.length) return null; const m = v.length / 2; return v.length % 2 ? v[Math.floor(m)] : (v[m - 1] + v[m]) / 2; };
    const mean = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
    const out = [];
    for (const set of ['All', 'PE / alternative', 'Hybrid', 'Traditional insurer', 'Bank / other', 'Unknown']) {
      const rows = set === 'All' ? base : base.filter((u) => u.backing === set);
      for (const stat of ['median', 'mean']) {
        const r = { set, stat, companies: rows.length, invested: rows.reduce((s, u) => s + (u.invested || 0), 0), net_res: rows.reduce((s, u) => s + (u.net_res || 0), 0) };
        for (const k of keys) r[k] = (stat === 'median' ? med : mean)(rows.map((u) => u[k]));
        out.push(r);
      }
    }
    return out;
  },
});

dash.draw('minsize', (n) => { n.textContent = fUsd(MIN_SIZE); });

dash.draw('val', (n) => {
  const d = dash.data(n.dataset.source);
  if (d.status !== 'ok') { n.textContent = '—'; return; }
  const [k, v] = (n.dataset.where || '=').split('=');
  const row = n.dataset.where ? d.data.find((r) => String(r[k]) === v) : d.data[0];
  n.textContent = (FMT[n.dataset.fmt] || String)(row ? row[n.dataset.field] : null);
});

dash.draw('shown', (n) => { n.textContent = peers() ? fInt(shown().length) : '—'; });

dash.draw('backing-table', (t) => {
  const d = dash.data('by_backing');
  if (d.status !== 'ok') { t.replaceChildren(); return; }
  const cols = [['companies', 'Companies', fInt], ['invested', 'Invested assets', fUsd], ['below_ig', 'Below investment grade', fPct], ['illiquid', 'Private and illiquid', fPct], ['priv', 'Private credit and loans', fPct], ['struct', 'Structured credit', fPct], ['affil', 'Affiliated', fPct], ['top10', 'Top 10 issuers', fPct], ['gap', 'Duration gap', fY], ['yield', 'Market yield', fY2]];
  t.replaceChildren(
    el('thead', null, el('tr', null, el('th', { 'data-field': 'backing' }, 'Backing'), ...cols.map(([k, l]) => el('th', { class: 'n', 'data-field': k }, l)))),
    el('tbody', null, ...d.data.map((r) => el('tr', { class: r.backing === 'All companies' ? 'sum' : null }, el('td', null, r.backing), ...cols.map(([k, , f]) => el('td', { class: 'n' }, f(r[k])))))),
  );
});

function laneLabels(g, names) {
  const labels = names.map((name) => g.append('text').attr('text-anchor', 'end').text(name));
  return Math.ceil(Math.max(...labels.map((l) => l.node().getComputedTextLength()))) + 10;
}

dash.draw('mix', (box) => {
  const d = dash.data('by_backing');
  box.replaceChildren();
  if (d.status !== 'ok') return;
  const rows = d.data.filter((r) => r.backing !== 'Unknown' && r.backing !== 'All companies');
  const w = Math.max(box.clientWidth, 280), lane = 44, h = rows.length * lane + 24;
  const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', 'Asset mix by backing');
  const left = laneLabels(svg, rows.map((r) => r.backing));
  svg.selectAll('text').remove();
  const x = d3.scaleLinear([0, 1], [left, w - 8]);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', h - 20).style('stroke', 'var(--cds-chart-grid)');
    svg.append('text').attr('x', x(t)).attr('y', h - 6).attr('text-anchor', t === 1 ? 'end' : t === 0 ? 'start' : 'middle').text(d3.format('.0%')(t));
  }
  const tip = tooltip(box);
  rows.forEach((r, i) => {
    const y = i * lane + 8;
    svg.append('text').attr('x', left - 10).attr('y', y + 14).attr('text-anchor', 'end').text(r.backing);
    let acc = 0;
    GROUPS.forEach(([k, label], gi) => {
      const v = r[`mix_${k}`] || 0;
      if (v > 0) {
        svg.append('rect').attr('x', x(acc)).attr('y', y).attr('width', Math.max(x(acc + v) - x(acc) - 2, 1)).attr('height', 20).attr('rx', 2).style('fill', dash.colors[gi])
          .on('pointermove', (ev) => tip.show(ev, `${r.backing}\n${label}: ${fPct(v)}`)).on('pointerleave', () => tip.hide());
      }
      acc += v;
    });
  });
});

dash.draw('mix-legend', (n) => {
  n.replaceChildren(...GROUPS.map(([, label], i) => el('span', null, el('i', { style: `background:${dash.colors[i]}` }), label)));
});
dash.draw('backing-legend', (n) => {
  n.replaceChildren(...BACKINGS.map((b) => el('span', null, el('i', { style: `background:${backColor(b)}` }), b)));
});

dash.draw('strip', (box) => {
  const rows = peers(), st = dash.data('peer_stats');
  box.replaceChildren();
  if (!rows || st.status !== 'ok') return;
  const key = S.strip, f = M[key][1];
  const pts = rows.filter((u) => u.level === 'entity' && (u.invested || 0) >= MIN_SIZE && u[key] != null);
  if (!pts.length) return;
  const w = Math.max(box.clientWidth, 280), lane = 44, h = BACKINGS.length * lane + 26;
  const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', `${M[key][0]} by backing`);
  const left = laneLabels(svg, BACKINGS);
  svg.selectAll('text').remove();
  const x = d3.scaleLinear(d3.extent(pts, (u) => u[key]), [left + 6, w - 22]).nice();
  for (const t of x.ticks(w < 460 ? 3 : 5)) {
    svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', h - 22).style('stroke', 'var(--cds-chart-grid)');
    svg.append('text').attr('x', x(t)).attr('y', h - 6).attr('text-anchor', 'middle').text(f(t));
  }
  const tip = tooltip(box);
  BACKINGS.forEach((b, i) => {
    const mid = i * lane + lane / 2;
    svg.append('text').attr('x', left - 10).attr('y', mid + 4).attr('text-anchor', 'end').text(b);
    const inLane = pts.filter((u) => u.backing === b);
    inLane.forEach((u, j) => {
      const dy = ((j * 7) % 5 - 2) * 4;
      const go = () => openCompany(u.unit_id);
      const text = `${u.name}\n${M[key][0]}: ${f(u[key])}\nInvested: ${fUsd(u.invested)}\n${u.sponsor || 'Owner not identified'}`;
      svg.append('circle').attr('cx', x(u[key])).attr('cy', mid + dy).attr('r', 4).style('fill', backColor(b)).style('stroke', 'var(--color-panel)');
      svg.append('circle').attr('cx', x(u[key])).attr('cy', mid + dy).attr('r', 8).style('fill', 'transparent').style('cursor', 'pointer')
        .on('pointermove', (ev) => tip.show(ev, text)).on('pointerleave', () => tip.hide()).on('click', go);
    });
    const m = st.data.find((r) => r.peer_set === b && r.metric === key);
    if (m && m.median != null) svg.append('line').attr('x1', x(m.median)).attr('x2', x(m.median)).attr('y1', mid - 15).attr('y2', mid + 15).style('stroke', 'var(--color-fg)').attr('stroke-width', 2).style('pointer-events', 'none');
  });
});

dash.draw('league', (t) => {
  if (!peers()) { t.replaceChildren(); return; }
  const cols = VIEWS[S.view];
  const rows = shown().sort((a, b) => {
    if (S.sort === 'name') return S.dir * a.name.localeCompare(b.name);
    const av = a[S.sort], bv = b[S.sort];
    if (av == null) return bv == null ? 0 : 1;
    if (bv == null) return -1;
    return S.dir * (av - bv);
  });
  const th = (key, label, cls) => {
    const b = el('button', { type: 'button' }, label + (S.sort === key ? (S.dir > 0 ? ' ↑' : ' ↓') : ''));
    b.addEventListener('click', () => { if (S.sort === key) S.dir = -S.dir; else { S.sort = key; S.dir = key === 'name' ? 1 : -1; } dash.draw('league'); });
    return el('th', { class: cls, 'data-field': key, 'aria-sort': S.sort === key ? (S.dir > 0 ? 'ascending' : 'descending') : 'none' }, b);
  };
  const body = rows.map((u) => {
    const tr = el('tr', { 'data-key': u.unit_id, class: u.level === 'entity' ? 'go' : null },
      el('td', { class: 'nm' }, u.name), el('td', null, u.backing), ...cols.map((k) => el('td', { class: 'n' }, M[k][1](u[k]))));
    if (u.level === 'entity') tr.addEventListener('click', () => openCompany(u.unit_id));
    return tr;
  });
  const sum = el('tr', { class: 'sum' }, el('td', null, 'Median of shown'), el('td'), ...cols.map((k) => el('td', { class: 'n' }, M[k][1](median(rows.map((u) => u[k]))))));
  t.replaceChildren(
    el('thead', null, el('tr', null, th('name', S.level === 'group' ? 'Group' : 'Company'), el('th', { 'data-field': 'backing' }, 'Backing'), ...cols.map((k) => th(k, M[k][0], 'n')))),
    el('tbody', null, ...body, sum),
  );
});

dash.draw('map', (box) => {
  box.replaceChildren();
  if (!peers()) return;
  const kx = S.mapX, ky = S.mapY;
  const pts = shown().filter((u) => u[kx] != null && u[ky] != null);
  if (!pts.length) { box.append(el('p', { class: 'bx-note' }, 'No company matches these filters.')); return; }
  const w = Math.max(box.clientWidth, 280), h = 380, m = { t: 10, r: 14, b: 44, l: 62 };
  const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', 'Peer map');
  const x = d3.scaleLinear(d3.extent(pts, (u) => u[kx]), [m.l, w - m.r]).nice();
  const y = d3.scaleLinear(d3.extent(pts, (u) => u[ky]), [h - m.b, m.t]).nice();
  for (const t of x.ticks(w < 460 ? 3 : 6)) {
    svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', h - m.b).style('stroke', 'var(--cds-chart-grid)');
    svg.append('text').attr('x', x(t)).attr('y', h - m.b + 16).attr('text-anchor', 'middle').text(M[kx][1](t));
  }
  for (const t of y.ticks(5)) {
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(M[ky][1](t));
  }
  svg.append('text').attr('x', (m.l + w - m.r) / 2).attr('y', h - 6).attr('text-anchor', 'middle').text(M[kx][0]);
  svg.append('text').attr('transform', `translate(12,${(m.t + h - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(M[ky][0]);
  const tip = tooltip(box);
  for (const u of pts) {
    svg.append('circle').attr('cx', x(u[kx])).attr('cy', y(u[ky])).attr('r', 4.5).style('fill', backColor(firstBacking(u))).style('stroke', 'var(--color-panel)');
    const hit = svg.append('circle').attr('cx', x(u[kx])).attr('cy', y(u[ky])).attr('r', 9).style('fill', 'transparent').style('cursor', u.level === 'entity' ? 'pointer' : 'default')
      .on('pointermove', (ev) => tip.show(ev, `${u.name}\n${u.backing}\n${M[kx][0]}: ${M[kx][1](u[kx])}\n${M[ky][0]}: ${M[ky][1](u[ky])}`)).on('pointerleave', () => tip.hide());
    if (u.level === 'entity') hit.on('click', () => openCompany(u.unit_id));
  }
});

const currentCompany = () => {
  const list = entities();
  return list.find((u) => u.unit_id === S.company) || list[0] || null;
};

dash.draw('co-pick', (sel) => {
  const list = entities();
  sel.replaceChildren(...[...list].sort((a, b) => a.name.localeCompare(b.name)).map((u) => new Option(u.name, u.unit_id)));
  const c = currentCompany();
  if (c) sel.value = c.unit_id;
  sel.onchange = () => openCompany(sel.value);
});

dash.draw('co-head', (box) => {
  const c = currentCompany();
  box.replaceChildren();
  if (!c) { box.textContent = '—'; return; }
  const w = `unit_id=${enc(c.unit_id)}`;
  const tile = (field, f, label) => el('div', { class: 'bx-tile' }, mark('b', 'peers', field, w, f(c[field])), el('span', null, label));
  const src = /^https:\/\//.test(c.source || '') ? el('a', { href: c.source, target: '_blank', rel: 'noopener noreferrer' }, 'Source') : null;
  const kids = [el('div', { class: 'bx-tiles' },
    tile('invested', fUsd, 'Invested assets'), tile('net_res', fUsd, 'Net reserves'), tile('sep', fUsd, 'Separate accounts'), tile('noninv', fUsd, 'Non-invested assets'),
    el('div', { class: 'bx-tile' }, mark('b', 'peers', 'backing', w, c.backing), el('span', null, c.sponsor || 'Owner not identified', src ? ' ' : null, src)))];
  if (c.note) kids.push(el('p', { class: 'bx-note', style: 'margin-top:var(--cds-gap-sm)' }, `Backing: ${c.note}${c.confidence ? ` (${c.confidence} confidence)` : ''}.`));
  if (c.data_notes) kids.push(el('p', { class: 'bx-care', style: 'margin-top:var(--cds-gap-sm)' }, `Read with care: ${c.data_notes.split(' | ').join('. ')}.`));
  box.replaceChildren(...kids);
});

dash.draw('co-strip', (t) => {
  const c = currentCompany(), st = dash.data('peer_stats');
  if (!c || st.status !== 'ok') { t.replaceChildren(); return; }
  const set = S.peerSet === 'same' ? c.backing : 'All';
  const stat = S.stat === 'mean' ? 'mean' : 'median';
  const w = `unit_id=${enc(c.unit_id)}`;
  const body = [];
  for (const [section, keys] of STRIP_ROWS) {
    body.push(el('tr', { class: 'sec' }, el('td', { colspan: '4' }, section)));
    for (const k of keys) {
      const s = st.data.find((r) => r.peer_set === set && r.metric === k);
      const f = M[k][1], v = c[k];
      const where = `peer_set=${enc(set)}&metric=${k}`;
      const track = el('div', { class: 'bx-track' });
      if (s && s.n) {
        const lo = Math.min(s.low, v ?? s.low), hi = Math.max(s.high, v ?? s.high), pos = (x) => (hi > lo ? (x - lo) / (hi - lo) * 100 : 50);
        track.append(el('i', { style: `left:${pos(s.p25)}%;width:${pos(s.p75) - pos(s.p25)}%;background:var(--cds-chart-muted)` }), el('u', { style: `left:${pos(s[stat])}%` }));
        if (v != null) track.append(el('s', { style: `left:${pos(v)}%;background:${dash.colors[0]}` }));
      }
      body.push(el('tr', null, el('td', null, M[k][0]), mark('td', 'peers', k, where && w, f(v), { class: 'n' }), mark('td', 'peer_stats', stat, where, f(s ? s[stat] : null), { class: 'n' }), el('td', { style: 'min-width:8rem' }, track)));
    }
  }
  const statLabel = stat === 'mean' ? 'Mean' : 'Median';
  t.replaceChildren(
    el('thead', null, el('tr', null, el('th', null, 'Measure'), el('th', { class: 'n' }, 'Company'), el('th', { class: 'n' }, set === 'All' ? `${statLabel}, all` : `${statLabel}, ${set}`), el('th', null, 'Range'))),
    el('tbody', null, ...body),
  );
});

dash.draw('co-issuers', (t) => {
  const c = currentCompany(), d = dash.data('top_issuers');
  if (!c || d.status !== 'ok') { t.replaceChildren(); return; }
  const rows = d.data.filter((r) => r.unit_id === c.unit_id).sort((a, b) => a.rn - b.rn);
  t.replaceChildren(
    el('thead', null, el('tr', null, el('th', { 'data-field': 'label' }, 'Issuer'), el('th', { class: 'n', 'data-field': 'usd' }, 'Amount'), el('th', { class: 'n', 'data-field': 'share' }, 'Share'))),
    el('tbody', null, ...rows.map((r) => el('tr', { 'data-key': `${enc(r.unit_id)},${enc(r.label).replace(/,/g, '%2C')}` }, el('td', null, r.label), el('td', { class: 'n' }, fUsd(r.usd)), el('td', { class: 'n' }, fPct(r.share))))),
  );
});

const defaultSbs = () => {
  const list = entities();
  const top = (b) => list.find((u) => u.backing === b)?.unit_id ?? null;
  return ['bk:PE / alternative', 'bk:Traditional insurer', 'bk:All', top('PE / alternative'), top('Traditional insurer')].filter(Boolean);
};
const sbsList = () => { if (!S.sbs) S.sbs = defaultSbs(); return S.sbs; };

dash.draw('sbs-picks', (box) => {
  const rows = peers();
  if (!rows) { box.replaceChildren(); return; }
  const picks = sbsList();
  const byName = (a, b) => a.name.localeCompare(b.name);
  const ents = rows.filter((u) => u.level === 'entity').sort(byName);
  const grps = rows.filter((u) => u.level === 'group').sort(byName);
  const group = (label, items) => { const g = el('optgroup', { label }); g.append(...items.map(([v, text]) => new Option(text, v))); return g; };
  const slots = picks.length < SBS_MAX ? [...picks, null] : [...picks];
  box.replaceChildren(...slots.map((val, i) => {
    const sel = el('select', { class: 'dash-select', 'aria-label': `Column ${i + 1}` });
    sel.append(new Option(val == null ? 'Add a column…' : 'Remove this column', ''),
      group('Backing groups', SETS.map((s) => [`bk:${s}`, setLabel(s)])),
      group('Company groups', grps.map((u) => [u.unit_id, u.name])),
      group('Legal entities', ents.map((u) => [u.unit_id, u.name])));
    sel.value = val ?? '';
    sel.onchange = () => {
      if (sel.value) S.sbs[i] = sel.value; else S.sbs.splice(i, 1);
      dash.draw('sbs-picks'); dash.draw('sbs');
    };
    return el('label', { class: 'bx-field bx-slot' }, `${i + 1}${val == null ? ` (up to ${SBS_MAX})` : ''}`, sel);
  }));
});

dash.draw('sbs', (t) => {
  const rows = peers(), gs = dash.data('group_stats');
  if (!rows) { t.replaceChildren(); return; }
  const stat = S.stat === 'mean' ? 'mean' : 'median';
  const cols = sbsList().map((id) => {
    if (id.startsWith('bk:')) {
      const set = id.slice(3);
      const r = gs.status === 'ok' ? gs.data.find((x) => x.set === set && x.stat === stat) : null;
      if (!r) return null;
      const w = `set=${enc(set)}&stat=${stat}`;
      return { src: 'group_stats', w, row: r, name: `${setLabel(set)} (${stat})`, backing: set === 'All' ? 'All' : set, sponsor: '–', count: r.companies };
    }
    const u = rows.find((x) => x.unit_id === id);
    return u ? { src: 'peers', w: `unit_id=${enc(u.unit_id)}`, row: u, name: u.name, backing: u.backing, sponsor: u.sponsor || '–', count: null } : null;
  }).filter(Boolean);
  if (!cols.length) { t.replaceChildren(el('tbody', null, el('tr', null, el('td', null, 'Add a column above.')))); return; }
  const cell = (c, field, text) => mark('td', c.src, field, c.w, text, { class: 'n' });
  const body = [
    el('tr', null, el('td', null, 'Backing'), ...cols.map((c) => (c.src === 'peers' ? mark('td', 'peers', 'backing', c.w, c.backing, { class: 'n' }) : el('td', { class: 'n' }, c.backing)))),
    el('tr', null, el('td', null, 'Owner or sponsor'), ...cols.map((c) => (c.src === 'peers' ? mark('td', 'peers', 'sponsor', c.w, c.sponsor, { class: 'n' }) : el('td', { class: 'n' }, '–')))),
    el('tr', null, el('td', null, 'Companies included'), ...cols.map((c) => (c.count == null ? el('td', { class: 'n' }, '–') : mark('td', 'group_stats', 'companies', c.w, fInt(c.count), { class: 'n' })))),
  ];
  for (const [section, keys] of SBS_ROWS) {
    body.push(el('tr', { class: 'sec' }, el('td', { colspan: String(cols.length + 1) }, section)));
    for (const k of keys) body.push(el('tr', null, el('td', null, M[k][0]), ...cols.map((c) => cell(c, k, M[k][1](c.row[k])))));
  }
  t.replaceChildren(
    el('thead', null, el('tr', null, el('th', null, 'Measure'), ...cols.map((c) => el('th', { class: 'n' }, c.name)))),
    el('tbody', null, ...body),
  );
});

dash.draw('tags', (t) => {
  const list = entities();
  if (!list.length) { t.replaceChildren(); return; }
  const head = [['name', 'Company'], ['invested', 'Invested'], ['backing', 'Backing'], ['sponsor', 'Owner or sponsor'], ['confidence', 'Confidence'], ['note', 'Note'], ['source', 'Source']];
  t.replaceChildren(
    el('thead', null, el('tr', null, ...head.map(([k, l]) => el('th', { 'data-field': k, class: k === 'invested' ? 'n' : null }, l)))),
    el('tbody', null, ...list.map((u) => el('tr', { 'data-key': u.unit_id },
      el('td', { class: 'nm' }, u.name), el('td', { class: 'n' }, fUsd(u.invested)), el('td', null, u.backing), el('td', null, u.sponsor), el('td', null, u.confidence), el('td', null, u.note),
      el('td', null, /^https:\/\//.test(u.source || '') ? el('a', { href: u.source, target: '_blank', rel: 'noopener noreferrer' }, u.source) : u.source)))),
  );
});

// Charts are drawn to the width of their box, so draw them again when it changes.
let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => ['mix', 'strip', 'map'].forEach((n) => dash.draw(n)), 150);
});

dash.drawAll();
dash.load({ peers: 'data/peers.json', top_issuers: 'data/top_issuers.json' })
  .then(() => dash.drawAll())
  .catch(() => {
    const p = document.getElementById('load-error');
    if (p) p.hidden = false;
  });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
