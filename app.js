import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Fill these in from Supabase > Project Settings > API (see SETUP.md).
const SUPABASE_URL = 'https://afhzsmntoolvpaezhvsu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IlRHD0lHiu51l_CMXAmZiQ_4i8Dt6tA';

const START = 9 * 60, END = 23 * 60, SNAP = 15; // timeline 09:00–23:00, stretched to the height available
const pct = m => `${(m - START) / (END - START) * 100}%`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const sb = SUPABASE_URL.startsWith('http') ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const S = { activities: [], done: [], tasks: [], periods: [], view: 'day', cursor: today(), lists: false, open: new Set(), focus: null, weekAdd: null };

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
function fmtDur(m) { return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`; }
// "Gym 2h" → { title: 'Gym', duration: 120 }. Only a trailing 2h / 90m / 1h30 / 1.5h counts; "Room 101" stays a title.
function parseQuick(text) {
  const t = text.trim(), m = t.match(/^(.+?)\s+(?:(\d+(?:\.\d+)?)h(\d+)?m?|(\d+)m(?:in)?)$/i);
  const dur = m && (m[4] ? +m[4] : Math.round(+m[2] * 60 + +(m[3] ?? 0)));
  return dur >= 5 && dur <= 840 ? { title: m[1], duration: dur } : { title: t, duration: null };
}

// ---------- queries over loaded data ----------
function activitiesOn(s) {
  const dow = parse(s).getDay();
  return S.activities.filter(a => a.repeat_days?.length
    ? a.repeat_days.includes(dow) && s >= a.date && (!a.repeat_until || s <= a.repeat_until) && !a.skip_dates.includes(s)
    : a.date === s
  ).sort((a, b) => (a.start_time ?? '~').localeCompare(b.start_time ?? '~') || a.position - b.position); // unplaced last
}
const placedOn = s => activitiesOn(s).filter(a => a.start_time);
const unplacedOn = s => activitiesOn(s).filter(a => !a.start_time);
const isDone = (a, s) => S.done.some(d => d.activity_id === a.id && d.date === s);
const tasksOn = s => S.tasks.filter(t => t.date === s && !t.period_id);
const goalsOf = p => S.tasks.filter(t => t.period_id === p.id);
const progress = list => `${list.filter(t => t.done).length}/${list.length}`;
const activePeriod = s => S.periods.find(p => p.start_date <= s && s <= p.end_date);
const toPlace = s => unplacedOn(s).filter(a => !isDone(a, s));
// Same title as an earlier activity → same colour; otherwise the last colour used.
const colourFor = title => S.activities.findLast(a => a.title.toLowerCase() === title.toLowerCase())?.color ?? S.activities.at(-1)?.color ?? '#ff3b5c';
const narrow = matchMedia('(max-width: 700px)');
narrow.addEventListener('change', () => document.body.classList.contains('signed-in') && render());

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
  github: 'M15 22v-4a4.8 4.8 0 00-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 004 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2',
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
  return placedOn(s).find(a => toMin(a.end_time) > m && !isDone(a, s)) ?? null;
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
  return err; // callers that must not move on after a failed write check this
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
        next && h('p', { class: 'hero-next', style: `--c:${next.color}` }, h('i'), `Next: ${next.title} at ${next.start_time.slice(0, 5)}`),
        rel === 0 && toPlace(s).length > 0 && h('p', { class: 'hero-plan' }, `${toPlace(s).length} to place · `,
          h('button', { class: 'link', onclick: () => planDay(s) }, 'Plan now'))),
      h('div', { class: 'legend' }, counts.map(([cls, label, d, t]) =>
        h('span', { class: cls }, h('i'), h('b', {}, t ? `${d}/${t}` : '–'), label)))),
    overdueBanner(),
    period && collapsible('strip' + period.id,
      [h('i', { class: 'goal-dot' }), h('h2', {}, `${period.name} goals`), h('span', { class: 'muted' }, progress(goalsOf(period)))],
      taskList(goalsOf(period), { period_id: period.id }), 'card goals-card'),
    narrow.matches && collapsible('unplaced', [h('h2', {}, `Unplaced (${unplacedOn(s).length})`)], unplacedPanel(s), 'card unplaced'),
    h('section', { class: 'card sched-card fill' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Schedule'),
        h('button', { class: 'primary', onclick: () => editActivity(null, s) }, icon('plus'), 'Activity')),
      h('div', { class: 'sched-body' },
        timeline([s]),
        !narrow.matches && h('aside', { class: 'unplaced', 'aria-label': 'Unplaced activities' },
          h('div', { class: 'card-head' }, h('h2', {}, 'Unplaced'), h('span', { class: 'muted' }, unplacedOn(s).length || '')),
          unplacedPanel(s)))),
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
  const t = today(), short = { day: 'numeric', month: 'short' };
  const late = S.tasks.filter(x => x.date && x.date < t && !x.done);
  const lateActs = S.activities.filter(a => !a.start_time && a.date < t && !isDone(a, a.date));
  const n = late.length + lateActs.length;
  if (!n) return null;
  return h('details', { class: 'card late', open: true },
    h('summary', {}, h('b', {}, `${n} unfinished from earlier days`)),
    h('ul', { class: 'tasks' },
      late.map(x => h('li', {},
        h('span', { class: 'grow' }, x.title, ' ', h('span', { class: 'date-chip' }, fmt(x.date, short))),
        h('button', { onclick: () => save(updTask(x, { date: t })) }, icon('forward'), 'Today'),
        h('button', { class: 'icon', title: 'Mark done', 'aria-label': 'Mark done', onclick: () => save(updTask(x, { done: true })) }, icon('check')),
        h('button', { class: 'icon', title: 'Delete', 'aria-label': 'Delete', onclick: () => save(sb.from('tasks').delete().eq('id', x.id)) }, icon('x')))),
      lateActs.map(a => h('li', { class: 'late-act', style: `--c:${a.color}` },
        h('i', { class: 'dot' }),
        h('span', { class: 'grow' }, a.title, ' ', h('span', { class: 'date-chip' }, `no time · ${fmt(a.date, short)}`)),
        h('button', { onclick: () => save(sb.from('activities').update({ date: t }).eq('id', a.id)) }, icon('forward'), 'Today'),
        h('button', { class: 'icon', title: 'Delete', 'aria-label': 'Delete', onclick: () => save(sb.from('activities').delete().eq('id', a.id)) }, icon('x'))))),
    n > 1 && h('button', {
      onclick: () => save(...[
        late.length && sb.from('tasks').update({ date: t }).in('id', late.map(x => x.id)),
        lateActs.length && sb.from('activities').update({ date: t }).in('id', lateActs.map(a => a.id)),
      ].filter(Boolean)),
    }, 'Move all to today'));
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
const swapAct = (a, b) => save(sb.from('activities').update({ position: b.position }).eq('id', a.id), sb.from('activities').update({ position: a.position }).eq('id', b.id));

function addFloating(s, text, key) {
  const { title, duration } = parseQuick(text);
  if (!title) return;
  S.focus = key;
  return save(sb.from('activities').insert({ title, duration, color: colourFor(title), date: s, start_time: null, end_time: null, position: Date.now() }));
}

// Activities for day s that have no time yet: plan button, quick add, then the list.
function unplacedPanel(s) {
  const list = unplacedOn(s), key = 'plan' + s;
  return h('div', { class: 'unplaced-body' },
    toPlace(s).length > 0 && h('button', { class: 'primary plan-btn', onclick: () => planDay(s) }, 'Plan the day'),
    h('form', { class: 'add', onsubmit: e => { e.preventDefault(); addFloating(s, e.target.t.value, key); } },
      h('input', { name: 't', 'data-k': key, placeholder: 'Add to plan… e.g. Gym 2h', autocomplete: 'off', 'aria-label': 'Add an activity without a time' }),
      h('button', { class: 'icon-add', 'aria-label': 'Add' }, icon('plus'))),
    list.length
      ? h('ul', { class: 'tasks floating' }, list.map((a, i) => h('li', { class: isDone(a, s) ? 'done' : '', style: `--c:${a.color};--on:${onColor(a.color)}` },
          h('input', { type: 'checkbox', checked: isDone(a, s), 'aria-label': `Done: ${a.title}`, onchange: () => toggleDone(a, s) }),
          h('span', { class: 'grow', title: 'Edit or delete', onclick: () => editActivity(a, s) }, a.title, a.duration && h('small', {}, fmtDur(a.duration))),
          h('button', { class: 'icon move', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: () => swapAct(a, list[i - 1]) }, icon('up')),
          h('button', { class: 'icon move', title: 'Move down', 'aria-label': 'Move down', disabled: i === list.length - 1, onclick: () => swapAct(a, list[i + 1]) }, icon('down')))))
      : h('p', { class: 'empty' }, 'Nothing to place. Add what you want to do, then plan it.'));
}

// ---------- plan the day ----------
// Earliest start on the 15-min grid, at or after `after`, where `dur` minutes fit between placed activities and end by 23:00; null if none.
function suggestSlot(s, dur, after) {
  const busy = placedOn(s).map(a => [toMin(a.start_time), toMin(a.end_time)]);
  for (let m = Math.ceil(Math.max(after, START) / SNAP) * SNAP; m + dur <= END; m += SNAP)
    if (!busy.some(([b, e]) => m < e && b < m + dur)) return m;
  return null;
}

// Step through the day's unplaced activities in their order, giving each a time. Every Place saves at once,
// so closing halfway keeps what's placed.
function planDay(s) {
  const dlg = $('#dlg'), items = toPlace(s), ends = []; // ends[i]: end minute of items[i] if placed in this session
  let i = 0, start = 0, busy = false, shownAt = 0, out = null, prop = null;
  const dur = () => items[i].duration ?? 60;
  const now = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  // One action at a time, and none in the first 250ms of a step, so a double tap can't also hit the next activity's button.
  const once = fn => async () => { if (busy || performance.now() - shownAt < 250) return; busy = true; try { await fn(); } finally { busy = false; } };
  const span = (st, en) => `left:${pct(Math.max(st, START))};width:${(Math.min(en, END) - Math.max(st, START)) / (END - START) * 100}%`;
  const move = delta => {
    start = Math.min(Math.max(start + delta, START), END - dur());
    out.textContent = `${toTime(start)} – ${toTime(start + dur())}`;
    prop.style.left = pct(start);
  };
  const place = once(async () => {
    if (await save(sb.from('activities').update({ start_time: toTime(start), end_time: toTime(start + dur()) }).eq('id', items[i].id))) return;
    ends[i] = start + dur();
    i++;
    show();
  });
  const skip = once(async () => { ends[i++] = undefined; show(); });
  const back = once(async () => {
    if (ends[i - 1] !== undefined && await save(sb.from('activities').update({ start_time: null, end_time: null }).eq('id', items[i - 1].id))) return;
    ends[--i] = undefined;
    show();
  });

  const strip = extra => h('div', { class: 'plan-strip', 'aria-hidden': 'true' },
    placedOn(s).filter(b => toMin(b.end_time) > START && toMin(b.start_time) < END)
      .map(b => h('i', { style: `${span(toMin(b.start_time), toMin(b.end_time))};--c:${b.color}` })),
    extra,
    [12, 15, 18, 21].map(hr => h('span', { style: `left:${pct(hr * 60)}` }, hr)));

  function show() {
    shownAt = performance.now();
    if (i >= items.length) return finish();
    const a = items[i], d = dur();
    const after = Math.max(START, s === today() ? now() : 0, ...ends.slice(0, i).filter(e => e !== undefined));
    const fit = suggestSlot(s, d, after);
    start = fit ?? Math.max(START, Math.floor((END - d) / SNAP) * SNAP);
    const nudge = (delta, name, label) => h('button', { type: 'button', class: 'icon', title: label, 'aria-label': label, onclick: () => move(delta) }, icon(name));
    out = h('output', { 'aria-live': 'polite' }, `${toTime(start)} – ${toTime(start + d)}`);
    prop = h('i', { class: 'proposed', style: `${span(start, start + d)};--c:${a.color}` });
    dlg.replaceChildren(h('div', { class: 'plan' },
      h('div', { class: 'plan-head' }, h('h3', {}, `Plan ${fmt(s, { weekday: 'long' })}`), h('span', { class: 'muted' }, `${i + 1} of ${items.length}`)),
      h('p', { class: 'plan-title', style: `--c:${a.color}` }, h('i'), h('b', {}, a.title), h('span', { class: 'muted' }, fmtDur(d))),
      h('div', { class: 'plan-time' }, nudge(-SNAP, 'left', '15 minutes earlier'), out, nudge(SNAP, 'right', '15 minutes later')),
      fit == null && h('p', { class: 'plan-note' }, 'Nothing free before 23:00. Nudge it into place or skip.'),
      strip(prop),
      h('div', { class: 'dialog-actions' },
        i > 0 && h('button', { type: 'button', class: 'ghost', onclick: back }, 'Back'),
        h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'skip', onclick: skip }, 'Skip'),
        h('button', { type: 'button', class: 'primary', onclick: place }, 'Place', icon('forward')))));
    dlg.querySelector('.primary').focus();
  }

  function finish() {
    const n = ends.filter(e => e !== undefined).length, left = items.length - n;
    out = null;
    dlg.replaceChildren(h('div', { class: 'plan plan-done' },
      h('h3', {}, 'Day planned'),
      h('p', { class: 'muted' }, `${n} placed${left ? `, ${left} still to place` : ''}.`),
      strip(),
      h('div', { class: 'dialog-actions' }, h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'primary', onclick: () => dlg.close() }, 'Done'))));
    dlg.querySelector('.primary').focus();
  }

  dlg.onkeydown = e => {
    if (!out) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); move(e.key === 'ArrowLeft' ? -SNAP : SNAP); }
    if (e.key === 'Enter' && !e.target.matches('.ghost, .skip, .icon')) { e.preventDefault(); place(); }
  };
  dlg.addEventListener('close', () => { dlg.onkeydown = null; }, { once: true });
  dlg.showModal();
  show();
}

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
    layout(placedOn(s)).map(({ a, st, en, l, n }) => {
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
  const series = !!a?.repeat_days?.length, floating = !!a && !a.start_time;
  const days = a?.repeat_days ?? [];
  const recent = [...new Set(S.activities.map(x => x.color))].slice(-10);
  const color = h('input', { type: 'color', name: 'color', 'aria-label': 'Pick any colour', value: a?.color ?? recent.at(-1) ?? '#ff3b5c' });
  dialog(a ? 'Edit activity' : 'New activity', [
    field('Title', h('input', { name: 'title', required: true, value: a?.title ?? '' })),
    !series && field('Date', h('input', { type: 'date', name: 'date', required: true, value: s })),
    floating
      ? field('Duration in minutes (optional)', h('input', { type: 'number', name: 'duration', min: 5, max: 840, value: a.duration ?? '' }))
      : h('div', { class: 'row' },
        field('Start', h('input', { type: 'time', name: 'start', required: true, value: a ? a.start_time.slice(0, 5) : toTime(st) })),
        field('End', h('input', { type: 'time', name: 'end', required: true, value: a ? a.end_time.slice(0, 5) : toTime(en) }))),
    field('Colour', h('div', { class: 'row' }, color,
      recent.map(c => h('button', { type: 'button', class: 'swatch', title: c, 'aria-label': `Use ${c}`, style: `background:${c}`, onclick: () => { color.value = c; } })))),
    !floating && h('fieldset', {}, h('legend', {}, 'Repeat every'),
      DAYS.map((d, i) => h('label', { class: 'pill' }, h('input', { type: 'checkbox', name: 'rep', value: (i + 1) % 7, checked: days.includes((i + 1) % 7) }), h('span', {}, d)))),
    !floating && field('Repeat until (optional)', h('input', { type: 'date', name: 'until', value: a?.repeat_until ?? '' })),
    series && h('fieldset', {}, h('legend', {}, 'Apply changes to'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'scope', value: 'this' }), 'This day only'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'scope', value: 'all', checked: true }), 'Every day it repeats')),
  ],
  fd => saveActivity(a, s, fd),
  a && (fd => fd.get('scope') === 'this' ? save(skipDay(a, s)) : save(sb.from('activities').delete().eq('id', a.id))));
}

const skipDay = (a, s) => sb.from('activities').update({ skip_dates: [...a.skip_dates, s] }).eq('id', a.id);

function saveActivity(a, s, fd) {
  if (a && !a.start_time) return save(sb.from('activities').update({ title: fd.get('title').trim(), color: fd.get('color'), date: fd.get('date'), duration: +fd.get('duration') || null }).eq('id', a.id));
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
      const t = tasksOn(s), fl = unplacedOn(s), label = fmt(s, { weekday: 'long' });
      return h('div', {}, h('button', { class: 'dayhead' + (s === today() ? ' today' : ''), onclick: () => go('day', s) },
        h('b', {}, fmt(s, { weekday: 'short', day: 'numeric' })),
        h('small', {}, t.length ? `${progress(t)} tasks` : ' ')),
        h('div', { class: 'strip' },
          fl.slice(0, 3).map(a => h('button', { class: 'chip', style: `--c:${a.color}`, title: a.title, onclick: () => go('day', s) }, h('i'), h('span', {}, a.title))),
          fl.length > 3 && h('button', { class: 'chip', onclick: () => go('day', s) }, `+${fl.length - 3}`),
          S.weekAdd === s
            ? h('form', { class: 'grow', onsubmit: e => { e.preventDefault(); addFloating(s, e.target.t.value, 'wk' + s); } },
              h('input', { name: 't', 'data-k': 'wk' + s, placeholder: 'e.g. Gym 2h', autocomplete: 'off', 'aria-label': `Add to ${label}`,
                onkeydown: e => { if (e.key === 'Escape') { e.preventDefault(); S.weekAdd = null; render(); } } }))
            : h('button', { class: 'icon', title: 'Add without a time', 'aria-label': `Add to ${label} without a time`, onclick: () => { S.weekAdd = s; S.focus = 'wk' + s; render(); } }, icon('plus'))));
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
  const back = location.origin + location.pathname;
  const MODES = {
    in: ['Welcome back.', 'Sign in'],
    up: ['Make your planner. You only do this once.', 'Create account'],
    forgot: ["We'll email you a link to set a new password. You only need it once.", 'Email me a link'],
  };
  const say = (text, err) => { $('#authMsg').textContent = text; $('#authMsg').classList.toggle('err', !!err); };
  const setMode = mode => {
    $('#login').dataset.mode = mode;
    document.querySelectorAll('#auth [data-modes]').forEach(el => {
      el.hidden = !el.dataset.modes.split(' ').includes(mode);
      el.querySelector('input')?.toggleAttribute('disabled', el.hidden); // hidden fields skip validation
    });
    [$('#authLead').textContent, $('#authGo').textContent] = MODES[mode];
    $('#login').password.autocomplete = mode === 'up' ? 'new-password' : 'current-password';
    say('');
  };
  document.querySelectorAll('#auth [data-to]').forEach(b => { b.onclick = () => setMode(b.dataset.to); });
  setMode('in');

  $('#github').onclick = () => sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: back } });
  $('#login').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, mode = f.dataset.mode, password = f.password.value;
    $('#authGo').disabled = true;
    say(mode === 'forgot' ? 'Sending…' : mode === 'up' ? 'Creating your account…' : 'Signing in…');
    let error;
    if (mode === 'forgot') {
      ({ error } = await sb.auth.resetPasswordForEmail(f.email.value, { redirectTo: back }));
      if (!error) say('Check your email and open the link. After that, you sign in with your password.');
    } else if (mode === 'up') {
      ({ error } = await sb.auth.signUp({ email: f.email.value, password, options: { data: { username: f.username.value.toLowerCase() } } }));
      if (error?.message.includes('Database error')) error = { message: 'That username is taken. Try another.' };
      else if (error?.code === 'user_already_exists') error = { message: 'That email already has an account. Sign in, or use "Forgot password?" to set a password.' };
    } else {
      let email = f.login.value.trim();
      if (!email.includes('@')) ({ data: email, error } = await sb.rpc('login_email', { login: email, password }));
      if (!error) ({ error } = email ? await sb.auth.signInWithPassword({ email, password }) : { error: { code: 'invalid_credentials' } });
      if (error?.code === 'invalid_credentials') error = { message: 'Wrong email, username or password.' };
      if (error?.code === 'email_not_confirmed') error = { message: 'This account was never confirmed. Use "Forgot password?" once to confirm it.' };
    }
    if (error) say(error.message, true);
    $('#authGo').disabled = false;
  };

  // Opened from a "set a new password" email: choose a password (and a username if the account has none).
  async function setPassword() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: profile } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
    dialog('Set your password', [
      field('Username', h('input', { name: 'username', value: profile?.username ?? '', required: true, pattern: '[A-Za-z0-9_]{3,20}', title: '3–20 letters, numbers or _', autocomplete: 'username' })),
      field('New password', h('input', { type: 'password', name: 'password', required: true, minlength: 6, autocomplete: 'new-password' })),
    ],
    fd => {
      (async () => {
        const { error } = await sb.from('profiles').upsert({ id: user.id, username: fd.get('username').toLowerCase() });
        if (error) { alert('That username is taken. Pick another.'); return setPassword(); }
        const { error: e2 } = await sb.auth.updateUser({ password: fd.get('password') });
        if (e2) { alert('Could not save the password: ' + e2.message); setPassword(); }
      })();
    });
  }

  $('#signout').onclick = () => sb.auth.signOut();
  sb.auth.onAuthStateChange((event, session) => {
    document.body.classList.toggle('signed-in', !!session);
    if (session) setTimeout(load); // Supabase advises not awaiting its calls inside this callback
    if (event === 'PASSWORD_RECOVERY') setTimeout(setPassword);
  });
  // Pick up changes made on another device when you come back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && document.body.classList.contains('signed-in')) load();
  });
}
