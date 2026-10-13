import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Fill these in from Supabase > Project Settings > API (see SETUP.md).
const SUPABASE_URL = 'https://afhzsmntoolvpaezhvsu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IlRHD0lHiu51l_CMXAmZiQ_4i8Dt6tA';

const START = 9 * 60, END = 23 * 60, SNAP = 15; // timeline 09:00–23:00, stretched to the height available
const pct = m => `${(m - START) / (END - START) * 100}%`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const sb = SUPABASE_URL.startsWith('http') ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const S = { activities: [], done: [], tasks: [], periods: [], view: 'day', cursor: today(), lists: false, open: new Set(), focus: null };

// ---------- dates (all local, as 'YYYY-MM-DD' strings) ----------
function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function today() { return iso(new Date()); }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
function addMonths(s, n) { const d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth() + n, 1)); }
function monday(s) { return addDays(s, -((parse(s).getDay() + 6) % 7)); }
function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
function toMin(t) { return +t.slice(0, 2) * 60 + +t.slice(3, 5); }
function toTime(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
function fmt(s, opts) { return parse(s).toLocaleDateString(undefined, opts); }

// ---------- queries over loaded data ----------
function activitiesOn(s) {
  const dow = parse(s).getDay();
  return S.activities.filter(a => a.repeat_days?.length
    ? a.repeat_days.includes(dow) && s >= a.date && (!a.repeat_until || s <= a.repeat_until) && !a.skip_dates.includes(s)
    : a.date === s
  ).sort((a, b) => a.start_time.localeCompare(b.start_time));
}
const isDone = (a, s) => S.done.some(d => d.activity_id === a.id && d.date === s);
const tasksOn = s => S.tasks.filter(t => t.date === s && !t.period_id);
const goalsOf = p => S.tasks.filter(t => t.period_id === p.id);
const progress = list => `${list.filter(t => t.done).length}/${list.length}`;
const activePeriod = s => S.periods.find(p => p.start_date <= s && s <= p.end_date);

// ---------- icons (24px stroke paths) ----------
const ICONS = {
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', check: 'M20 6L9 17l-5-5', x: 'M18 6L6 18M6 6l12 12',
  up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z', forward: 'M5 12h14M13 6l6 6-6 6',
  day: 'M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  week: 'M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 10h18M9 10v10M15 10v10',
  month: 'M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  out: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
};
function icon(name) {
  const el = document.createElement('span');
  el.className = 'ic';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICONS[name]}"/></svg>`;
  return el;
}

// Black or white text, whichever has the higher WCAG contrast on the activity's own colour.
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0533 ? '#FFFFFF' : '#0B0D12'; // 0.0533 ≈ luminance of #0B0D12 + 0.05
}

// The first not-done activity on day s that hasn't ended yet (only meaningful for today).
function nextActivity(s) {
  if (s !== today()) return null;
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  return activitiesOn(s).find(a => toMin(a.end_time) > m && !isDone(a, s)) ?? null;
}

// ---------- data ----------
// ponytail: loads everything and refetches after every write; fine for one person's planner.
async function load() {
  const res = await Promise.all(['activities', 'activity_done', 'tasks', 'periods'].map(t => sb.from(t).select('*')));
  const err = res.find(r => r.error);
  if (err) return alert('Could not load: ' + err.error.message);
  [S.activities, S.done, S.tasks, S.periods] = res.map(r => r.data);
  S.tasks.sort((a, b) => a.position - b.position);
  S.periods.sort((a, b) => a.start_date.localeCompare(b.start_date));
  render();
}

async function save(...queries) {
  const err = (await Promise.all(queries)).find(r => r.error);
  if (err) alert('Could not save: ' + err.error.message);
  await load();
}
const updTask = (t, v) => sb.from('tasks').update(v).eq('id', t.id);

// ---------- DOM helper ----------
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return el;
}
const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);

function dialog(title, body, onSave, onDelete) {
  const dlg = $('#dlg');
  const form = h('form', {
    onsubmit: e => {
      e.preventDefault();
      if (onSave(new FormData(form)) !== false) dlg.close(); // onSave returns false to keep the dialog open
    },
  },
    h('h3', {}, title), body,
    h('div', { class: 'dialog-actions' },
      onDelete && h('button', { type: 'button', class: 'danger', onclick: () => { dlg.close(); onDelete(new FormData(form)); } }, 'Delete'),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'ghost', onclick: () => dlg.close() }, 'Cancel'),
      h('button', { class: 'primary' }, 'Save')));
  dlg.replaceChildren(form);
  dlg.showModal();
}

// ---------- render ----------
function render() {
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === S.view && !S.lists));
  $('#listsBtn').classList.toggle('on', S.lists);
  document.body.classList.toggle('show-lists', S.lists);
  document.body.className = document.body.className.replace(/view-\w+/, 'view-' + S.view);
  $('#date').value = S.cursor;
  $('#title').textContent =
    S.view === 'day' ? fmt(S.cursor, { weekday: 'long', day: 'numeric', month: 'long' })
    : S.view === 'week' ? `Week of ${fmt(monday(S.cursor), { day: 'numeric', month: 'short' })}`
    : fmt(S.cursor, { month: 'long', year: 'numeric' });
  $('#main').replaceChildren(...{ day: dayView, week: weekView, month: monthView }[S.view]().filter(Boolean));
  $('#lists').replaceChildren(...listsView());
  if (S.focus) { document.querySelector(`[data-k="${S.focus}"]`)?.focus(); S.focus = null; }
}

function dayView() {
  const s = S.cursor, acts = activitiesOn(s), tasks = tasksOn(s), period = activePeriod(s);
  const counts = [
    ['sched', 'schedule', acts.filter(a => isDone(a, s)).length, acts.length],
    ['tasks', 'tasks', tasks.filter(t => t.done).length, tasks.length],
    ['goals', 'goals', period ? goalsOf(period).filter(g => g.done).length : 0, period ? goalsOf(period).length : 0],
  ];
  const rel = daysBetween(today(), s), next = nextActivity(s);
  const sub = period
    ? `${period.name} · day ${daysBetween(period.start_date, s) + 1} of ${daysBetween(period.start_date, period.end_date) + 1}`
    : rel === 0 ? 'Today' : rel === 1 ? 'Tomorrow' : rel === -1 ? 'Yesterday' : fmt(s, { year: 'numeric' });
  return [
    h('section', { class: 'hero' },
      rings(counts.map(([, , d, t]) => t ? d / t : 0)),
      h('div', {},
        h('h1', { class: 'date' }, fmt(s, { weekday: 'short' }), h('span', {}, fmt(s, { day: 'numeric', month: 'short' }))),
        h('p', { class: 'hero-sub' }, sub),
        next && h('p', { class: 'hero-next', style: `--c:${next.color}` }, h('i'), `Next: ${next.title} at ${next.start_time.slice(0, 5)}`)),
      h('div', { class: 'legend' }, counts.map(([cls, label, d, t]) =>
        h('span', { class: cls }, h('i'), h('b', {}, t ? `${d}/${t}` : '–'), label)))),
    overdueBanner(),
    period && collapsible('strip' + period.id,
      [h('i', { class: 'goal-dot' }), h('h2', {}, `${period.name} goals`), h('span', { class: 'muted' }, progress(goalsOf(period)))],
      taskList(goalsOf(period), { period_id: period.id }), 'card goals-card'),
    h('section', { class: 'card sched-card fill' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Schedule'),
        h('button', { class: 'primary', onclick: () => editActivity(null, s) }, icon('plus'), 'Activity')),
      timeline([s])),
  ];
}

// The three rings (schedule, tasks, goals). Arcs start where they were last render and
// animate to the new value; a ring that just closed pops once.
const RING_R = [57, 41, 25];
function rings(fracs) {
  const prev = S.rings ?? [0, 0, 0];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 132 132');
  svg.setAttribute('class', 'rings');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Schedule ${Math.round(fracs[0] * 100)}%, tasks ${Math.round(fracs[1] * 100)}%, goals ${Math.round(fracs[2] * 100)}% done`);
  const arcs = ['sched', 'tasks', 'goals'].map((cls, i) => {
    const c = 2 * Math.PI * RING_R[i];
    svg.innerHTML += `<circle class="track ${cls}" cx="66" cy="66" r="${RING_R[i]}"/>` +
      `<circle class="arc ${cls}${fracs[i] >= 1 && prev[i] < 1 ? ' closed' : ''}" cx="66" cy="66" r="${RING_R[i]}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(prev[i], 1))}"/>`;
    return c;
  });
  S.rings = fracs;
  requestAnimationFrame(() => requestAnimationFrame(() =>
    svg.querySelectorAll('.arc').forEach((el, i) => {
      // An empty ring keeps a dot of colour so it still reads as a ring to fill.
      el.style.strokeDashoffset = arcs[i] * (1 - Math.max(Math.min(fracs[i], 1), 0.001));
    })));
  return svg;
}

function overdueBanner() {
  const t = today(), late = S.tasks.filter(x => x.date && x.date < t && !x.done);
  if (!late.length) return null;
  return h('details', { class: 'card late', open: true },
    h('summary', {}, h('b', {}, `${late.length} unfinished from earlier days`)),
    h('ul', { class: 'tasks' }, late.map(x => h('li', {},
      h('span', { class: 'grow' }, x.title, ' ', h('span', { class: 'date-chip' }, fmt(x.date, { day: 'numeric', month: 'short' }))),
      h('button', { onclick: () => save(updTask(x, { date: t })) }, icon('forward'), 'Today'),
      h('button', { class: 'icon', title: 'Mark done', 'aria-label': 'Mark done', onclick: () => save(updTask(x, { done: true })) }, icon('check')),
      h('button', { class: 'icon', title: 'Delete', 'aria-label': 'Delete', onclick: () => save(sb.from('tasks').delete().eq('id', x.id)) }, icon('x'))))),
    late.length > 1 && h('button', { onclick: () => save(sb.from('tasks').update({ date: t }).in('id', late.map(x => x.id))) }, 'Move all to today'));
}

function collapsible(key, summary, body, cls = 'card') {
  return h('details', { class: cls, open: S.open.has(key), ontoggle: e => e.target.open ? S.open.add(key) : S.open.delete(key) },
    h('summary', {}, summary), body);
}

function taskList(tasks, defaults) {
  const key = defaults.date || defaults.period_id || 'inbox';
  return h('div', {},
    tasks.length ? null : h('p', { class: 'empty' }, defaults.period_id ? 'No goals yet.' : defaults.date ? 'Nothing to do yet. Add the first thing.' : 'Inbox is empty.'),
    h('ul', { class: 'tasks' }, tasks.map((t, i) => h('li', { class: t.done ? 'done' : '' },
      h('input', { type: 'checkbox', checked: t.done, 'aria-label': `Done: ${t.title}`, onchange: e => save(updTask(t, { done: e.target.checked })) }),
      h('span', { class: 'grow', title: 'Edit, move to another day or delete', onclick: () => editTask(t) }, t.title),
      h('button', { class: 'icon move', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: () => swap(t, tasks[i - 1]) }, icon('up')),
      h('button', { class: 'icon move', title: 'Move down', 'aria-label': 'Move down', disabled: i === tasks.length - 1, onclick: () => swap(t, tasks[i + 1]) }, icon('down'))))),
    h('form', {
      class: 'add',
      onsubmit: e => {
        e.preventDefault();
        const title = e.target.t.value.trim();
        if (!title) return;
        S.focus = key;
        save(sb.from('tasks').insert({ ...defaults, title, position: Date.now() }));
      },
    }, h('input', { name: 't', 'data-k': key, placeholder: defaults.period_id ? 'Add a goal…' : 'Add a task…', autocomplete: 'off' }), h('button', {}, 'Add')));
}

const swap = (a, b) => save(updTask(a, { position: b.position }), updTask(b, { position: a.position }));

function editTask(t) {
  dialog(t.period_id ? 'Goal' : 'Task', [
    field('Title', h('input', { name: 'title', required: true, value: t.title })),
    !t.period_id && field('Date (leave empty for the inbox)', h('input', { type: 'date', name: 'date', value: t.date ?? '' })),
  ],
  fd => save(updTask(t, { title: fd.get('title').trim(), ...(!t.period_id && { date: fd.get('date') || null }) })),
  () => save(sb.from('tasks').delete().eq('id', t.id)));
}

// ---------- timeline ----------
function timeline(dates) {
  const hours = [];
  for (let m = START; m < END; m += 60) hours.push(h('div', { class: 'hour', style: `top:${pct(m)}` }, toTime(m)));
  return h('div', { class: 'timeline', style: `--n:${dates.length}` }, h('div', { class: 'hours' }, hours), dates.map(column));
}

// Overlapping activities sit side by side in lanes; each group of overlaps gets its own lane count.
function layout(acts) {
  const placed = [];
  let group = [], lanes = [], groupEnd = 0;
  const flush = () => { group.forEach(p => { p.n = lanes.length; }); group = []; lanes = []; };
  for (const a of acts) {
    const st = toMin(a.start_time), en = toMin(a.end_time);
    if (st >= groupEnd) flush();
    let l = lanes.findIndex(end => end <= st);
    if (l < 0) l = lanes.push(0) - 1;
    lanes[l] = en;
    groupEnd = Math.max(groupEnd, en);
    const p = { a, st, en, l };
    group.push(p);
    placed.push(p);
  }
  flush();
  return placed;
}

function column(s) {
  const next = nextActivity(s);
  const col = h('div', { class: 'col' },
    layout(activitiesOn(s)).map(({ a, st, en, l, n }) => {
      const top = Math.max(st, START), bot = Math.min(en, END);
      if (bot <= top) return null;
      const done = isDone(a, s);
      return h('div', {
        class: 'block' + (done ? ' done' : '') + (a === next ? ' next' : ''),
        style: `top:${pct(top)};height:${(bot - top) / (END - START) * 100}%;left:${l / n * 100}%;width:${100 / n}%;--c:${a.color};--on:${onColor(a.color)}`,
        onclick: e => { e.stopPropagation(); editActivity(a, s); },
      },
        h('input', { type: 'checkbox', checked: done, title: 'Done', 'aria-label': `Done: ${a.title}`, onclick: e => e.stopPropagation(), onchange: () => toggleDone(a, s) }),
        h('div', { class: 'grow' },
          h('b', {}, a.title),
          h('small', {}, `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`)));
    }));
  if (s === today()) {
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    if (m >= START && m < END) col.append(h('div', { class: 'now', style: `top:${pct(m)}` }));
  }
  attachCreate(col, s);
  return col;
}

// Mouse: drag over empty time to create. Touch: tap an empty slot (dragging would fight scrolling).
function attachCreate(col, s) {
  let start = null, ghost = null, ptr = '';
  const minAt = e => {
    const r = col.getBoundingClientRect();
    const m = START + Math.round((e.clientY - r.top) / r.height * (END - START) / SNAP) * SNAP;
    return Math.min(END, Math.max(START, m));
  };
  const range = e => [Math.min(start, minAt(e)), Math.max(start, minAt(e))];
  col.addEventListener('pointerdown', e => {
    ptr = e.pointerType;
    if (e.target !== col || ptr !== 'mouse' || e.button !== 0) return;
    start = minAt(e);
    ghost = h('div', { class: 'ghost-block' });
    col.append(ghost);
    col.setPointerCapture(e.pointerId);
  });
  col.addEventListener('pointermove', e => {
    if (start == null) return;
    const [a, b] = range(e);
    ghost.style.top = pct(a);
    ghost.style.height = (b - a) / (END - START) * 100 + '%';
  });
  col.addEventListener('pointerup', e => {
    if (start == null) return;
    let [a, b] = range(e);
    start = null;
    ghost.remove();
    if (b - a < SNAP) { a = Math.min(a, END - 60); b = a + 60; } // a plain click = 1 hour
    editActivity(null, s, a, b);
  });
  col.addEventListener('click', e => {
    if (e.target !== col || ptr === 'mouse') return;
    const a = Math.min(Math.floor(minAt(e) / 60) * 60, END - 60);
    editActivity(null, s, a, a + 60);
  });
}

const toggleDone = (a, s) => save(isDone(a, s)
  ? sb.from('activity_done').delete().eq('activity_id', a.id).eq('date', s)
  : sb.from('activity_done').insert({ activity_id: a.id, date: s }));

// ---------- activity form ----------
function editActivity(a, s, st = 9 * 60, en = 10 * 60) {
  const series = !!a?.repeat_days?.length;
  const days = a?.repeat_days ?? [];
  const recent = [...new Set(S.activities.map(x => x.color))].slice(-10);
  const color = h('input', { type: 'color', name: 'color', 'aria-label': 'Pick any colour', value: a?.color ?? recent.at(-1) ?? '#ff3b5c' });
  dialog(a ? 'Edit activity' : 'New activity', [
    field('Title', h('input', { name: 'title', required: true, value: a?.title ?? '' })),
    !series && field('Date', h('input', { type: 'date', name: 'date', required: true, value: s })),
    h('div', { class: 'row' },
      field('Start', h('input', { type: 'time', name: 'start', required: true, value: a ? a.start_time.slice(0, 5) : toTime(st) })),
      field('End', h('input', { type: 'time', name: 'end', required: true, value: a ? a.end_time.slice(0, 5) : toTime(en) }))),
    field('Colour', h('div', { class: 'row' }, color,
      recent.map(c => h('button', { type: 'button', class: 'swatch', title: c, 'aria-label': `Use ${c}`, style: `background:${c}`, onclick: () => { color.value = c; } })))),
    h('fieldset', {}, h('legend', {}, 'Repeat every'),
      DAYS.map((d, i) => h('label', { class: 'pill' }, h('input', { type: 'checkbox', name: 'rep', value: (i + 1) % 7, checked: days.includes((i + 1) % 7) }), h('span', {}, d)))),
    field('Repeat until (optional)', h('input', { type: 'date', name: 'until', value: a?.repeat_until ?? '' })),
    series && h('fieldset', {}, h('legend', {}, 'Apply changes to'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'scope', value: 'this' }), 'This day only'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'scope', value: 'all', checked: true }), 'Every day it repeats')),
  ],
  fd => saveActivity(a, s, fd),
  a && (fd => fd.get('scope') === 'this' ? save(skipDay(a, s)) : save(sb.from('activities').delete().eq('id', a.id))));
}

const skipDay = (a, s) => sb.from('activities').update({ skip_dates: [...a.skip_dates, s] }).eq('id', a.id);

function saveActivity(a, s, fd) {
  const row = {
    title: fd.get('title').trim(),
    color: fd.get('color'),
    start_time: fd.get('start'),
    end_time: fd.get('end'),
    repeat_days: fd.getAll('rep').map(Number),
    repeat_until: fd.get('until') || null,
  };
  if (row.end_time <= row.start_time) { alert('End time must be after start time.'); return false; }
  if (!row.repeat_days.length) row.repeat_days = null;
  if (!a) return save(sb.from('activities').insert({ ...row, date: fd.get('date') }));
  if (fd.get('scope') === 'this')
    return save(skipDay(a, s), sb.from('activities').insert({ ...row, repeat_days: null, repeat_until: null, date: s }));
  // Date field is hidden for a series; a series turned into a one-off lands on the day being viewed.
  const date = fd.get('date') ?? (row.repeat_days ? a.date : s);
  return save(sb.from('activities').update({ ...row, date }).eq('id', a.id));
}

// ---------- week & month ----------
function weekView() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday(S.cursor), i));
  return [h('section', { class: 'card week fill' },
    h('div', { class: 'week-head' }, h('div'), days.map(s => {
      const t = tasksOn(s);
      return h('button', { class: 'dayhead' + (s === today() ? ' today' : ''), onclick: () => go('day', s) },
        h('b', {}, fmt(s, { weekday: 'short', day: 'numeric' })),
        h('small', {}, t.length ? `${progress(t)} tasks` : ' '));
    })),
    timeline(days))];
}

function monthView() {
  const first = S.cursor.slice(0, 8) + '01', month = first.slice(0, 7);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(monday(first), i));
  return [h('section', { class: 'card month fill' },
    DAYS.map(d => h('div', { class: 'dow' }, d)),
    cells.map(s => {
      const t = tasksOn(s), acts = activitiesOn(s), colors = [...new Set(acts.map(a => a.color))];
      const total = t.length + acts.length, doneN = t.filter(x => x.done).length + acts.filter(a => isDone(a, s)).length;
      return h('button', {
        class: `cell${s.slice(0, 7) !== month ? ' other' : ''}${s === today() ? ' today' : ''}`,
        'aria-label': fmt(s, { weekday: 'long', day: 'numeric', month: 'long' }) + (total ? `, ${doneN} of ${total} done` : ''),
        onclick: () => go('day', s),
      },
        h('div', { class: 'top' },
          h('span', { class: 'num' }, +s.slice(8)),
          total ? h('i', { class: 'mini', style: `--p:${Math.round(doneN / total * 100)}` }) : null),
        h('div', { class: 'dots' }, colors.slice(0, 6).map(c => h('i', { style: `background:${c}` }))));
    }))];
}

// ---------- inbox & periods ----------
function listsView() {
  const inbox = S.tasks.filter(t => !t.date && !t.period_id);
  return [
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Inbox')),
      h('p', { class: 'muted' }, 'Tasks without a day yet. Tap one to give it a date.'),
      taskList(inbox, {})),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Periods'), h('button', { onclick: () => editPeriod(null) }, icon('plus'), 'Period')),
      S.periods.length ? null : h('p', { class: 'empty' }, 'Make one for a stretch of time, like "Half-term break", and give it goals.'),
      S.periods.map(p => collapsible('list' + p.id,
      [h('i', { class: 'goal-dot' }),
        h('span', { class: 'grow' }, h('b', {}, p.name), h('br'),
          h('span', { class: 'muted' }, `${fmt(p.start_date, { day: 'numeric', month: 'short' })} – ${fmt(p.end_date, { day: 'numeric', month: 'short' })} · ${progress(goalsOf(p))} goals`)),
        h('button', { class: 'icon', title: 'Edit period', 'aria-label': `Edit ${p.name}`, onclick: e => { e.preventDefault(); editPeriod(p); } }, icon('edit'))],
      taskList(goalsOf(p), { period_id: p.id }), 'period'))),
    h('section', { class: 'card taskcard' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Tasks'),
        h('span', { class: 'muted' }, S.cursor === today() ? 'Today' : fmt(S.cursor, { weekday: 'short', day: 'numeric', month: 'short' }))),
      taskList(tasksOn(S.cursor), { date: S.cursor })),
  ];
}

function editPeriod(p) {
  dialog(p ? 'Edit period' : 'New period', [
    field('Name', h('input', { name: 'name', required: true, value: p?.name ?? '' })),
    h('div', { class: 'row' },
      field('From', h('input', { type: 'date', name: 'start', required: true, value: p?.start_date ?? S.cursor })),
      field('To', h('input', { type: 'date', name: 'end', required: true, value: p?.end_date ?? addDays(S.cursor, 15) }))),
  ],
  fd => {
    const row = { name: fd.get('name').trim(), start_date: fd.get('start'), end_date: fd.get('end') };
    if (row.end_date < row.start_date) { alert('The end date must be after the start date.'); return false; }
    return save(p ? sb.from('periods').update(row).eq('id', p.id) : sb.from('periods').insert(row));
  },
  p && (() => confirm(`Delete "${p.name}" and all its goals?`) && save(sb.from('periods').delete().eq('id', p.id))));
}

// ---------- navigation & auth ----------
function go(view, s = S.cursor) { S.view = view; S.cursor = s; S.lists = false; render(); }
function step(n) {
  S.cursor = S.view === 'day' ? addDays(S.cursor, n) : S.view === 'week' ? addDays(S.cursor, 7 * n) : addMonths(S.cursor, n);
  render();
}

document.querySelectorAll('[data-icon]').forEach(el => el.prepend(icon(el.dataset.icon)));
document.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => go(b.dataset.view); });
$('#prev').onclick = () => step(-1);
$('#next').onclick = () => step(1);
$('#todayBtn').onclick = () => go(S.view, today());
$('#date').onchange = e => e.target.value && go(S.view, e.target.value);
$('#listsBtn').onclick = () => { S.lists = !S.lists; render(); };

if (!sb) {
  $('#login').replaceChildren(h('p', {}, 'Almost there: fill in SUPABASE_URL and SUPABASE_ANON_KEY at the top of app.js (see SETUP.md).'));
} else {
  $('#login').onsubmit = async e => {
    e.preventDefault();
    $('#authMsg').textContent = 'Sending…';
    const { error } = await sb.auth.signInWithOtp({ email: e.target.email.value, options: { emailRedirectTo: location.origin + location.pathname } });
    $('#authMsg').textContent = error ? error.message : 'Check your email and open the link on this device.';
  };
  $('#signout').onclick = () => sb.auth.signOut();
  sb.auth.onAuthStateChange((_event, session) => {
    document.body.classList.toggle('signed-in', !!session);
    if (session) setTimeout(load); // Supabase advises not awaiting its calls inside this callback
  });
  // Pick up changes made on another device when you come back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && document.body.classList.contains('signed-in')) load();
  });
}
