import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Fill these in from Supabase > Project Settings > API (see SETUP.md).
const SUPABASE_URL = 'https://afhzsmntoolvpaezhvsu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IlRHD0lHiu51l_CMXAmZiQ_4i8Dt6tA';

const START = 7 * 60, END = 23 * 60, SNAP = 15; // timeline 07:00–23:00, 1px per minute
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
    h('div', { class: 'row' },
      onDelete && h('button', { type: 'button', class: 'danger', onclick: () => { dlg.close(); onDelete(new FormData(form)); } }, 'Delete'),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', onclick: () => dlg.close() }, 'Cancel'),
      h('button', { class: 'primary' }, 'Save')));
  dlg.replaceChildren(form);
  dlg.showModal();
}

// ---------- render ----------
function render() {
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === S.view));
  document.body.classList.toggle('show-lists', S.lists);
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
  const s = S.cursor, acts = activitiesOn(s), tasks = tasksOn(s);
  const total = acts.length + tasks.length;
  const doneN = acts.filter(a => isDone(a, s)).length + tasks.filter(t => t.done).length;
  return [
    overdueBanner(),
    ...periodStrips(s),
    h('div', { class: 'day' },
      h('section', { class: 'card taskcard' },
        h('div', { class: 'row' }, h('h2', {}, 'Tasks'),
          total ? h('span', { class: 'muted' }, `${doneN}/${total} done (${Math.round(doneN / total * 100)}%)`) : null),
        taskList(tasks, { date: s })),
      h('section', { class: 'card sched' },
        h('div', { class: 'row' }, h('h2', {}, 'Schedule'), h('button', { onclick: () => editActivity(null, s) }, '+ Activity')),
        timeline([s]))),
  ];
}

function overdueBanner() {
  const t = today(), late = S.tasks.filter(x => x.date && x.date < t && !x.done);
  if (!late.length) return null;
  return h('details', { class: 'card', open: true },
    h('summary', {}, h('b', {}, `${late.length} unfinished from earlier days`)),
    h('ul', { class: 'tasks' }, late.map(x => h('li', {},
      h('span', { class: 'grow' }, x.title, h('small', { class: 'muted' }, ' · ' + fmt(x.date, { day: 'numeric', month: 'short' }))),
      h('button', { onclick: () => save(updTask(x, { date: t })) }, '→ Today'),
      h('button', { title: 'Mark done', onclick: () => save(updTask(x, { done: true })) }, '✓'),
      h('button', { title: 'Delete', onclick: () => save(sb.from('tasks').delete().eq('id', x.id)) }, '✕')))),
    late.length > 1 && h('button', { onclick: () => save(sb.from('tasks').update({ date: t }).in('id', late.map(x => x.id))) }, 'Move all to today'));
}

function collapsible(key, summary, body) {
  return h('details', { class: 'card', open: S.open.has(key), ontoggle: e => e.target.open ? S.open.add(key) : S.open.delete(key) },
    h('summary', {}, summary), body);
}

function periodStrips(s) {
  return S.periods.filter(p => p.start_date <= s && s <= p.end_date).map(p =>
    collapsible('strip' + p.id,
      [h('b', {}, p.name), ` · day ${daysBetween(p.start_date, s) + 1}/${daysBetween(p.start_date, p.end_date) + 1} · goals ${progress(goalsOf(p))}`],
      taskList(goalsOf(p), { period_id: p.id })));
}

function taskList(tasks, defaults) {
  const key = defaults.date || defaults.period_id || 'inbox';
  return h('div', {},
    h('ul', { class: 'tasks' }, tasks.map((t, i) => h('li', { class: t.done ? 'done' : '' },
      h('input', { type: 'checkbox', checked: t.done, onchange: e => save(updTask(t, { done: e.target.checked })) }),
      h('span', { class: 'grow', title: 'Edit, move to another day or delete', onclick: () => editTask(t) }, t.title),
      h('button', { class: 'icon', title: 'Move up', disabled: i === 0, onclick: () => swap(t, tasks[i - 1]) }, '↑'),
      h('button', { class: 'icon', title: 'Move down', disabled: i === tasks.length - 1, onclick: () => swap(t, tasks[i + 1]) }, '↓')))),
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
  for (let m = START; m < END; m += 60) hours.push(h('div', { class: 'hour', style: `top:${m - START}px` }, toTime(m)));
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
  const col = h('div', { class: 'col' },
    layout(activitiesOn(s)).map(({ a, st, en, l, n }) => {
      const top = Math.max(st, START), bot = Math.min(en, END);
      if (bot <= top) return null;
      const done = isDone(a, s);
      return h('div', {
        class: 'block' + (done ? ' done' : ''),
        style: `top:${top - START}px;height:${bot - top}px;left:${l / n * 100}%;width:${100 / n}%;--c:${a.color}`,
        onclick: e => { e.stopPropagation(); editActivity(a, s); },
      },
        h('input', { type: 'checkbox', checked: done, title: 'Done', onclick: e => e.stopPropagation(), onchange: () => toggleDone(a, s) }),
        h('b', {}, a.title),
        h('small', {}, `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`));
    }));
  if (s === today()) {
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    if (m >= START && m < END) col.append(h('div', { class: 'now', style: `top:${m - START}px` }));
  }
  attachCreate(col, s);
  return col;
}

// Mouse: drag over empty time to create. Touch: tap an empty slot (dragging would fight scrolling).
function attachCreate(col, s) {
  let start = null, ghost = null, ptr = '';
  const minAt = e => {
    const m = START + Math.round((e.clientY - col.getBoundingClientRect().top) / SNAP) * SNAP;
    return Math.min(END, Math.max(START, m));
  };
  const range = e => [Math.min(start, minAt(e)), Math.max(start, minAt(e))];
  col.addEventListener('pointerdown', e => {
    ptr = e.pointerType;
    if (e.target !== col || ptr !== 'mouse' || e.button !== 0) return;
    start = minAt(e);
    ghost = h('div', { class: 'block ghost' });
    col.append(ghost);
    col.setPointerCapture(e.pointerId);
  });
  col.addEventListener('pointermove', e => {
    if (start == null) return;
    const [a, b] = range(e);
    ghost.style.top = a - START + 'px';
    ghost.style.height = b - a + 'px';
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
  const color = h('input', { type: 'color', name: 'color', value: a?.color ?? recent.at(-1) ?? '#4f6bff' });
  dialog(a ? 'Edit activity' : 'New activity', [
    field('Title', h('input', { name: 'title', required: true, value: a?.title ?? '' })),
    !series && field('Date', h('input', { type: 'date', name: 'date', required: true, value: s })),
    h('div', { class: 'row' },
      field('Start', h('input', { type: 'time', name: 'start', required: true, value: a ? a.start_time.slice(0, 5) : toTime(st) })),
      field('End', h('input', { type: 'time', name: 'end', required: true, value: a ? a.end_time.slice(0, 5) : toTime(en) }))),
    field('Colour', h('div', { class: 'row' }, color,
      recent.map(c => h('button', { type: 'button', class: 'swatch', title: c, style: `background:${c}`, onclick: () => { color.value = c; } })))),
    h('fieldset', {}, h('legend', {}, 'Repeat every'),
      DAYS.map((d, i) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'rep', value: (i + 1) % 7, checked: days.includes((i + 1) % 7) }), d))),
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
  return [h('section', { class: 'card week' },
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
  return [h('section', { class: 'card month' },
    DAYS.map(d => h('div', { class: 'dow' }, d)),
    cells.map(s => {
      const t = tasksOn(s), colors = [...new Set(activitiesOn(s).map(a => a.color))];
      return h('button', { class: `cell${s.slice(0, 7) !== month ? ' other' : ''}${s === today() ? ' today' : ''}`, onclick: () => go('day', s) },
        h('span', { class: 'num' }, +s.slice(8)),
        h('div', { class: 'dots' }, colors.slice(0, 6).map(c => h('i', { style: `background:${c}` }))),
        t.length ? h('small', {}, progress(t)) : null);
    }))];
}

// ---------- inbox & periods ----------
function listsView() {
  const inbox = S.tasks.filter(t => !t.date && !t.period_id);
  return [
    h('section', { class: 'card' }, h('h2', {}, 'Inbox'),
      h('p', { class: 'muted' }, 'Tasks without a day. Tap one to give it a date.'),
      taskList(inbox, {})),
    h('section', { class: 'card' },
      h('div', { class: 'row' }, h('h2', {}, 'Periods'), h('button', { onclick: () => editPeriod(null) }, '+ Period')),
      S.periods.length ? null : h('p', { class: 'muted' }, 'No periods yet. Create one, e.g. "Half-term break", and add goals to it.')),
    ...S.periods.map(p => collapsible('list' + p.id,
      [h('b', {}, p.name),
        h('small', { class: 'muted' }, ` ${fmt(p.start_date, { day: 'numeric', month: 'short' })} – ${fmt(p.end_date, { day: 'numeric', month: 'short' })} · ${progress(goalsOf(p))} `),
        h('button', { class: 'icon', title: 'Edit period', onclick: e => { e.preventDefault(); editPeriod(p); } }, '✎')],
      taskList(goalsOf(p), { period_id: p.id }))),
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
