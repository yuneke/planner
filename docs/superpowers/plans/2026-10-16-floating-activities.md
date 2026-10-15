# Floating Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users add activities to a day without a time, then give each one a time on a step-through "Plan the day" screen.

**Architecture:** An activity whose `start_time` is null is "unplaced". Everything that draws the timeline uses only placed activities, while the ring, month dots and done ticks keep using all of them. The new UI (the Unplaced panel, the plan dialog and the Week strip) is plain functions in `app.js` that follow the existing `h()` DOM-helper pattern.

**Tech Stack:** Static HTML/CSS/JS (ES modules, no build), Supabase Postgres, and a browser test page (`test/test.js`) served by `test/serve.js` with a fake Supabase (`test/fake.js`).

**Spec:** `docs/superpowers/specs/2026-10-16-floating-activities-design.md`

## Global Constraints

- No new dependencies and no build step. Code goes in `app.js` and `style.css`, and SQL in a new `plans.sql`.
- Use the existing tokens only (`--ground --surface --raised --line --text --muted --sched --tasks --goals --on-accent --ease --display`). Don't add new colours.
- Timeline range: `START = 9*60`, `END = 23*60`, `SNAP = 15` (already in `app.js`).
- Duration is in minutes, 5–840. When it's missing, placing uses 60.
- Copy, used verbatim:
  - Panel heading: "Unplaced". Quick-add placeholder: "Add to plan… e.g. Gym 2h". Panel button: "Plan the day".
  - Hero nudge: "N to place · Plan now".
  - Plan dialog: "Plan {weekday}" and "{i} of {n}". When full: "Nothing free before 23:00. Nudge it into place or skip." Done screen: "Day planned".
  - Banner: "N unfinished from earlier days".
- Phone breakpoint is `(max-width: 700px)`, the same as the existing CSS.
- After code changes, run `graphify update .`.
- Commit lines end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Running the tests

The server runs in the background. Start it once per session:

```bash
cd /c/Users/yahya/Desktop/planner && node test/serve.js
```

Then run the suite in a 1280×800 window:

```bash
playwright-cli open http://localhost:8765/ >/dev/null 2>&1; playwright-cli resize 1280 800 >/dev/null 2>&1; playwright-cli goto http://localhost:8765/ >/dev/null 2>&1; sleep 4; playwright-cli eval "document.querySelector('#out').textContent"; playwright-cli close >/dev/null 2>&1; rm -rf .playwright-cli
```

Baseline: every line is `PASS` except two failures that already happen on `main`: `week shows repeats` and `month dots`. They aren't caused by this work, so leave them.

## Review Focus

1. **Planning a full or late day:** if nothing fits before 23:00, the plan screen must still work. It shows the note and starts at the latest start that ends by 23:00. Tested in Task 3.
2. **Double-tapping Place:** it must place the item once and must not skip the next one. Tested in Task 3.
3. **An unplaced activity ticked done on a past day:** it must not appear in the leftovers banner. Tested in Task 5.
4. **Odd quick-add text ("Room 101", "1h30", "45m"):** only a trailing `h`/`m` token becomes the duration. Tested in Task 2.
5. **Editing an unplaced activity:** the dialog must not demand Start/End (the old "End time must be after start time" check would fire). Tested in Task 2.

---

### Task 1: Unplaced activities in the data model

**Files:**
- Create: `plans.sql`
- Modify: `app.js` (`activitiesOn` around line 29, `nextActivity` around line 71, `column` around line 276)
- Modify: `test/fake.js` (insert of activities)
- Modify: `SETUP.md` §1 step 2
- Test: `test/test.js` (append before the `} catch (e)` line)

**Interfaces:**
- Produces: `placedOn(s): Activity[]` (activities with a `start_time`, sorted by start) and `unplacedOn(s): Activity[]` (activities with `start_time == null`, sorted by `position`). `activitiesOn(s)` now returns placed activities first, then unplaced ones.

- [ ] **Step 1: Write the failing test.** Append to `test/test.js`, just before `} catch (e) {`:

```js
  // ---- floating activities ----
  const schedTotal = () => +document.querySelector('.legend .sched b').textContent.split('/')[1] || 0;
  btn('Current').click(); await sleep(20);
  const before1 = schedTotal();
  db.activities.push({ id: 'f1', title: 'Swim', color: '#3bd6ff', start_time: null, end_time: null, duration: 60, position: 1, date: todayS, repeat_days: null, repeat_until: null, skip_dates: [] });
  document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  ok(!titles().includes('Swim'), 'unplaced activity stays off the timeline');
  ok(schedTotal() === before1 + 1, 'ring counts unplaced as not done: ' + schedTotal());
```

- [ ] **Step 2: Run the tests to check they fail.** Use the command in Global Constraints. Expected: an `ERROR` line (`toMin` is called on null in `layout`) or a FAIL for the new checks.

- [ ] **Step 3: Write `plans.sql`.**

```sql
-- Activities without a time yet ("unplaced"). Paste into Supabase > SQL Editor > New query and click Run (once, after schema.sql).
alter table activities
  alter column start_time drop not null,
  alter column end_time drop not null,
  add column duration int check (duration between 5 and 840),  -- minutes, used when placing
  add column position double precision not null default 0,     -- order in the Unplaced list
  add constraint placed_or_not check ((start_time is null) = (end_time is null)),
  add constraint unplaced_once check (start_time is not null or repeat_days is null);
```

- [ ] **Step 4: Update the queries in `app.js`.** Replace the sort line in `activitiesOn` and add the two helpers right after the function:

```js
  ).sort((a, b) => (a.start_time ?? '~').localeCompare(b.start_time ?? '~') || a.position - b.position); // unplaced last
}
const placedOn = s => activitiesOn(s).filter(a => a.start_time);
const unplacedOn = s => activitiesOn(s).filter(a => !a.start_time);
```

In `nextActivity`, change `activitiesOn(s).find(` to `placedOn(s).find(`. In `column`, change `layout(activitiesOn(s))` to `layout(placedOn(s))`.

- [ ] **Step 5: Teach the fake about null times.** In `test/fake.js`, replace the `Object.assign(row, {...})` for activities with:

```js
      if (this.t === 'activities') Object.assign(row, { skip_dates: [], repeat_days: row.repeat_days ?? null, repeat_until: row.repeat_until ?? null, start_time: row.start_time && row.start_time + ':00', end_time: row.end_time && row.end_time + ':00', duration: row.duration ?? null, position: row.position ?? 0 });
```

- [ ] **Step 6: Document the SQL.** In `SETUP.md` §1 step 2, change the last sentence to: "Then do the same with `accounts.sql` (usernames) and `plans.sql` (activities without a time)."

- [ ] **Step 7: Run the tests to check they pass.** Expected: both new checks PASS, and nothing fails except the two baseline failures.

- [ ] **Step 8: Commit.**

```bash
git add plans.sql app.js test/fake.js test/test.js SETUP.md
git commit -m "Allow activities without a time (unplaced)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Unplaced panel, quick add and editing

**Files:**
- Modify: `app.js`: `S` (line 13), helpers after `toTime` (line 25), `dayView` (line 143), `editActivity` and `saveActivity` (lines 344–386). Add `unplacedPanel` after `taskList`.
- Modify: `style.css` (append a section after the `/* ---------- timeline` block)
- Test: `test/test.js`

**Interfaces:**
- Consumes: `placedOn`, `unplacedOn` (Task 1).
- Produces:
  - `parseQuick(text): { title: string, duration: number|null }`
  - `fmtDur(min): string` (`45m`, `2h`, `1h30`)
  - `colourFor(title): string` (hex)
  - `addFloating(s, text, focusKey): Promise|undefined`
  - `toPlace(s): Activity[]` (unplaced and not done)
  - `swapAct(a, b)`
  - `narrow` (a MediaQueryList)
  - `unplacedPanel(s): HTMLElement`
  - The DOM: `.unplaced form.add` (quick add) and `.unplaced li .grow` (titles).

- [ ] **Step 1: Write the failing tests.** Append after the Task 1 block:

```js
  // ---- unplaced panel ----
  const quick = async x => { const q = document.querySelector('.unplaced form.add'); q.t.value = x; q.requestSubmit(); await sleep(100); };
  const floatList = () => all('.unplaced li .grow').map(x => x.textContent);
  db.activities.find(a => a.title === 'Maths').color = '#123456';
  document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  ok(floatList().includes('Swim1h'), 'unplaced list shows Swim: ' + floatList());
  await quick('Read 1h30');
  const read = db.activities.find(a => a.title === 'Read');
  ok(read?.duration === 90 && read.start_time == null && read.date === todayS, 'quick add "Read 1h30": ' + JSON.stringify(read));
  ok(document.activeElement?.dataset.k === 'plan' + todayS, 'focus stays in plan box');
  await quick('Room 101');
  ok(db.activities.some(a => a.title === 'Room 101' && a.duration == null), '"Room 101" keeps the number');
  await quick('maths 2h');
  ok(db.activities.find(a => a.title === 'maths')?.color === '#123456', 'colour reused by title');
  ok(floatList().join('|') === 'Swim1h|Read1h30|Room 101|maths2h', 'list order + durations: ' + floatList().join('|'));
  all('.unplaced button[title="Move down"]')[0].click(); await sleep(100);
  ok(floatList()[0] === 'Read1h30', 'reorder unplaced');
  all('.unplaced li .grow').find(x => x.textContent.startsWith('Room')).click();
  f = document.querySelector('#dlg form');
  ok(!f.start && !f.querySelector('[name=rep]') && f.duration, 'unplaced edit: duration, no times or repeat');
  f.duration.value = '30'; f.requestSubmit(); await sleep(100);
  ok(db.activities.find(a => a.title === 'Room 101').duration === 30 && !document.querySelector('#dlg').open, 'unplaced edit saves');
```

- [ ] **Step 2: Run the tests to check they fail.** Expected: `ERROR` (`.unplaced form.add` is null).

- [ ] **Step 3: Add the helpers.** In `app.js`, after `function fmt(...)` (line 26), add:

```js
function fmtDur(m) { return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`; }
// "Gym 2h" → { title: 'Gym', duration: 120 }. Only a trailing 2h / 90m / 1h30 / 1.5h counts; "Room 101" stays a title.
function parseQuick(text) {
  const t = text.trim(), m = t.match(/^(.+?)\s+(?:(\d+(?:\.\d+)?)h(\d+)?m?|(\d+)m(?:in)?)$/i);
  const dur = m && (m[4] ? +m[4] : Math.round(+m[2] * 60 + +(m[3] ?? 0)));
  return dur >= 5 && dur <= 840 ? { title: m[1], duration: dur } : { title: t, duration: null };
}
```

After the `activePeriod` line (the end of the queries block), add:

```js
const toPlace = s => unplacedOn(s).filter(a => !isDone(a, s));
// Same title as an earlier activity → same colour; otherwise the last colour used.
const colourFor = title => S.activities.findLast(a => a.title.toLowerCase() === title.toLowerCase())?.color ?? S.activities.at(-1)?.color ?? '#ff3b5c';
const narrow = matchMedia('(max-width: 700px)');
narrow.addEventListener('change', () => document.body.classList.contains('signed-in') && render());
```

Change the `S` initialiser to include `weekAdd: null` (Task 4 uses it):

```js
const S = { activities: [], done: [], tasks: [], periods: [], view: 'day', cursor: today(), lists: false, open: new Set(), focus: null, weekAdd: null };
```

- [ ] **Step 4: Add the panel.** After `const swap = ...` (line 238), add:

```js
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
```

`planDay` is defined in Task 3. Until then, add a temporary stub right after `unplacedPanel` so the button doesn't throw: `function planDay() {}`. Task 3 replaces it.

- [ ] **Step 5: Put the panel in the Day view.** In `dayView`, replace the final `h('section', { class: 'card sched-card fill' }, ...)` element with:

```js
    narrow.matches && collapsible('unplaced', [h('h2', {}, `Unplaced (${unplacedOn(s).length})`)], unplacedPanel(s), 'card unplaced'),
    h('section', { class: 'card sched-card fill' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Schedule'),
        h('button', { class: 'primary', onclick: () => editActivity(null, s) }, icon('plus'), 'Activity')),
      h('div', { class: 'sched-body' },
        timeline([s]),
        !narrow.matches && h('aside', { class: 'unplaced', 'aria-label': 'Unplaced activities' },
          h('div', { class: 'card-head' }, h('h2', {}, 'Unplaced'), h('span', { class: 'muted' }, unplacedOn(s).length || '')),
          unplacedPanel(s)))),
```

- [ ] **Step 6: Edit unplaced activities without times.** In `editActivity`, add `const floating = !!a && !a.start_time;` after `const series = ...`. Replace the Start/End `h('div', { class: 'row' }, ...)` with:

```js
    floating
      ? field('Duration in minutes (optional)', h('input', { type: 'number', name: 'duration', min: 5, max: 840, step: 5, value: a.duration ?? '' }))
      : h('div', { class: 'row' },
        field('Start', h('input', { type: 'time', name: 'start', required: true, value: a ? a.start_time.slice(0, 5) : toTime(st) })),
        field('End', h('input', { type: 'time', name: 'end', required: true, value: a ? a.end_time.slice(0, 5) : toTime(en) }))),
```

Prefix the repeat fieldset with `!floating &&`, and do the same for the "Repeat until" field. At the top of `saveActivity`, add:

```js
  if (a && !a.start_time) return save(sb.from('activities').update({ title: fd.get('title').trim(), color: fd.get('color'), date: fd.get('date'), duration: +fd.get('duration') || null }).eq('id', a.id));
```

- [ ] **Step 7: Style the panel.** Append to `style.css` after the timeline section:

```css
/* ---------- unplaced ---------- */
.sched-body { flex: 1; min-height: 0; display: flex; gap: 16px; }
.sched-body .timeline { flex: 1; min-width: 0; }
.unplaced { width: 248px; flex: none; display: flex; flex-direction: column; gap: 10px; padding: 10px 0 4px 16px; border-left: 1px solid var(--line); overflow-y: auto; }
.unplaced .card-head { margin: 0; }
.unplaced-body { display: flex; flex-direction: column; gap: 10px; }
details.unplaced .unplaced-body { margin-top: 12px; }
.plan-btn { width: 100%; min-height: 40px; }
.icon-add { width: 40px; min-height: 40px; padding: 0; flex: none; }
ul.floating { margin: 0; }
.floating li { gap: 10px; padding: 8px 0; }
.floating input[type=checkbox] { border-color: var(--c); }
.floating input[type=checkbox]:checked { background: var(--c); }
.floating input[type=checkbox]::after { border-color: var(--on); }
.floating li.done .grow { text-decoration-color: color-mix(in srgb, var(--c) 60%, transparent); }
.floating small { color: var(--muted); font-weight: 600; font-size: 12px; margin-left: 6px; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 8: Run the tests to check they pass.** Expected: all Task 1 and Task 2 checks PASS. The existing checks still pass, including `page fits the viewport`, `focus stays in add box` and `tap prefills hour`. If `tap prefills hour` fails, the timeline column's height has changed; check that `.sched-body` has `flex: 1; min-height: 0`.

- [ ] **Step 9: Commit.**

```bash
git add app.js style.css test/test.js
git commit -m "Unplaced panel: quick add, reorder, edit activities without a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Plan the day dialog and hero nudge

**Files:**
- Modify: `app.js`: replace the `planDay` stub, and add `suggestSlot`. Add the hero nudge in `dayView`.
- Modify: `style.css` (append a `/* ---------- plan the day ---------- */` section)
- Test: `test/test.js`

**Interfaces:**
- Consumes: `placedOn`, `toPlace`, `fmtDur`, `save`, `pct`, `toTime`, `toMin`, `icon`, `h`, `fmt`, `today`.
- Produces:
  - `suggestSlot(s, dur, after): number|null` (minutes)
  - `planDay(s): void` (opens `#dlg`)
  - The DOM: `#dlg output` holds `"HH:MM – HH:MM"` (en dash with spaces), and the buttons read `Back`, `Skip`, `Place`, `Done`, with `[aria-label="15 minutes later"]` and `[aria-label="15 minutes earlier"]` for the nudges. `.hero-plan` has a `Plan now` button.

- [ ] **Step 1: Write the failing tests.** Append after the Task 2 block:

```js
  // ---- plan the day (on empty future days, so suggestions don't depend on the clock) ----
  const isoOf = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const dayPlus = n => { const x = new Date(d); x.setDate(d.getDate() + n); return isoOf(x); };
  const fixture = (id, title, date, st, en, duration) => ({ id, title, color: '#888888', start_time: st, end_time: en, duration, position: 0, date, repeat_days: null, repeat_until: null, skip_dates: [] });
  const dlg = document.querySelector('#dlg'), time = () => dlg.querySelector('output')?.textContent;
  const dlgBtn = t => [...dlg.querySelectorAll('button')].find(b => b.textContent === t);
  btn('Current').click(); await sleep(20);
  ok(document.querySelector('.hero-plan')?.textContent.includes('to place'), 'hero nudge on today');
  document.querySelector('.hero-plan button').click(); await sleep(20);
  ok(dlg.open && dlg.textContent.includes('Plan '), 'Plan now opens the planner');
  dlg.close();
  db.activities.push(fixture('busy', 'Busy', dayPlus(1), '09:30:00', '10:00:00', null));
  document.querySelector('#next').click(); document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  for (const x of ['Run 1h', 'Study 2h', 'Call 30m']) await quick(x);
  btn('Plan the day').click(); await sleep(20);
  ok(dlg.open && dlg.textContent.includes('1 of 3') && time() === '10:00 – 11:00', 'suggests first free slot after busy block: ' + time());
  dlgBtn('Place').click(); dlgBtn('Place')?.click(); await sleep(200);
  ok(db.activities.find(a => a.title === 'Run').start_time === '10:00', 'Place saves the time');
  ok(dlg.textContent.includes('2 of 3') && time() === '11:00 – 13:00', 'double Place places once; next slot follows: ' + time());
  dlg.querySelector('[aria-label="15 minutes later"]').click();
  ok(time() === '11:15 – 13:15', 'nudge later');
  dlg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  ok(time() === '11:00 – 13:00', 'arrow key nudges');
  dlgBtn('Back').click(); await sleep(200);
  ok(db.activities.find(a => a.title === 'Run').start_time == null && dlg.textContent.includes('1 of 3'), 'Back unplaces the previous one');
  dlgBtn('Place').click(); await sleep(200);
  dlgBtn('Skip').click(); await sleep(50);
  ok(dlg.textContent.includes('3 of 3') && time() === '11:00 – 11:30', 'Skip moves on: ' + time());
  dlgBtn('Place').click(); await sleep(200);
  ok(dlg.textContent.includes('Day planned') && dlg.textContent.includes('2 placed, 1 still to place'), 'done screen: ' + dlg.textContent);
  dlgBtn('Done').click(); await sleep(20);
  ok(titles().includes('Run') && titles().includes('Call') && !titles().includes('Study'), 'placed blocks on the timeline: ' + titles());
  db.activities.push(fixture('full', 'Exams', dayPlus(2), '09:00:00', '23:00:00', null), { ...fixture('nap', 'Nap', dayPlus(2), null, null, 120), position: 1 });
  document.querySelector('#next').click(); document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  btn('Plan the day').click(); await sleep(20);
  ok(dlg.textContent.includes('Nothing free before 23:00') && time() === '21:00 – 23:00', 'full day: note + latest slot: ' + time());
  dlg.close();
```

- [ ] **Step 2: Run the tests to check they fail.** Expected: FAIL `hero nudge on today`, then an `ERROR` (null `.hero-plan`).

- [ ] **Step 3: Write `suggestSlot` and `planDay`.** Replace the `function planDay() {}` stub with:

```js
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
  let i = 0, start = 0, busy = false, out = null, prop = null;
  const dur = () => items[i].duration ?? 60;
  const now = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const once = fn => async () => { if (busy) return; busy = true; try { await fn(); } finally { busy = false; } };
  const move = delta => {
    start = Math.min(Math.max(start + delta, START), END - dur());
    out.textContent = `${toTime(start)} – ${toTime(start + dur())}`;
    prop.style.left = pct(start);
  };
  const place = once(async () => {
    await save(sb.from('activities').update({ start_time: toTime(start), end_time: toTime(start + dur()) }).eq('id', items[i].id));
    ends[i++] = start + dur();
    show();
  });
  const skip = once(async () => { ends[i++] = undefined; show(); });
  const back = once(async () => {
    i--;
    if (ends[i] !== undefined) {
      ends[i] = undefined;
      await save(sb.from('activities').update({ start_time: null, end_time: null }).eq('id', items[i].id));
    }
    show();
  });
  const span = (st, en) => `left:${pct(Math.max(st, START))};width:${(Math.min(en, END) - Math.max(st, START)) / (END - START) * 100}%`;

  function show() {
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
      h('div', { class: 'plan-strip', 'aria-hidden': 'true' },
        placedOn(s).filter(b => toMin(b.end_time) > START && toMin(b.start_time) < END)
          .map(b => h('i', { style: `${span(toMin(b.start_time), toMin(b.end_time))};--c:${b.color}` })),
        prop,
        [12, 15, 18, 21].map(hr => h('span', { style: `left:${pct(hr * 60)}` }, hr))),
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
      h('div', { class: 'dialog-actions' }, h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'primary', onclick: () => dlg.close() }, 'Done'))));
    dlg.querySelector('.primary').focus();
  }

  dlg.onkeydown = e => {
    if (!out) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); move(e.key === 'ArrowLeft' ? -SNAP : SNAP); }
    if (e.key === 'Enter' && !e.target.matches('.ghost, .skip')) { e.preventDefault(); place(); }
  };
  dlg.addEventListener('close', () => { dlg.onkeydown = null; }, { once: true });
  show();
  dlg.showModal();
}
```

- [ ] **Step 4: Add the hero nudge.** In `dayView`, after the `next && h('p', { class: 'hero-next' ... })` line inside the hero's inner `h('div', {}, ...)`, add:

```js
        rel === 0 && toPlace(s).length > 0 && h('p', { class: 'hero-plan' }, `${toPlace(s).length} to place · `,
          h('button', { class: 'link', onclick: () => planDay(s) }, 'Plan now'))),
```

(Move the closing paren of that inner `div` from the `hero-next` line to here.)

- [ ] **Step 5: Style the dialog.** Append to `style.css`:

```css
/* ---------- plan the day ---------- */
.hero-plan { margin: 4px 0 0; font-weight: 600; }
.hero-plan .link { min-height: 0; padding: 0; color: var(--tasks); text-decoration-color: currentColor; font-weight: 700; }
.plan { display: flex; flex-direction: column; gap: 16px; }
.plan-head { display: flex; align-items: baseline; gap: 12px; }
.plan-head h3 { flex: 1; }
.plan-head .muted { font-weight: 600; font-variant-numeric: tabular-nums; }
.plan-title { display: flex; align-items: center; gap: 10px; margin: 4px 0 0; font-family: var(--display); font-size: 28px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
.plan-title i { width: 14px; height: 14px; border-radius: 50%; background: var(--c); flex: none; }
.plan-title b { font-weight: inherit; min-width: 0; overflow-wrap: anywhere; }
.plan-title .muted { font: 600 15px/1.4 system-ui, sans-serif; letter-spacing: 0; flex: none; }
.plan-time { display: flex; align-items: center; justify-content: space-between; background: var(--ground); border-radius: 14px; padding: 6px; }
.plan-time output { font-family: var(--display); font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.plan-time button.icon { width: 44px; min-height: 44px; }
.plan-note { margin: -6px 0 0; color: #FF8099; font-size: 14px; }
.plan-strip { position: relative; height: 36px; margin-bottom: 18px; border-radius: 10px; background: repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px calc(100% / 14)), var(--ground); }
.plan-strip i { position: absolute; top: 5px; bottom: 5px; border-radius: 6px; background: color-mix(in srgb, var(--c) 40%, var(--raised)); }
.plan-strip .proposed { background: var(--c); box-shadow: 0 0 0 2px var(--text); z-index: 1; transition: left .3s var(--ease); }
.plan-strip span { position: absolute; top: calc(100% + 4px); transform: translateX(-50%); font-size: 11px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.plan-done h3 { font-size: 32px; font-weight: 900; font-stretch: 112%; letter-spacing: -.03em; animation: dlg-in .5s var(--ease); }
```

- [ ] **Step 6: Run the tests to check they pass.** Expected: every Task 3 check PASSes.

- [ ] **Step 7: Commit.**

```bash
git add app.js style.css test/test.js
git commit -m "Plan the day: step through unplaced activities and give each a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Week view strip

**Files:**
- Modify: `app.js` (`weekView`, around line 390)
- Modify: `style.css` (the week section)
- Test: `test/test.js`

**Interfaces:**
- Consumes: `unplacedOn`, `addFloating`, `S.weekAdd`, `S.focus`, `go`, `render`.
- Produces: the DOM `.week .strip` containing `.chip` buttons, a `+` button with `aria-label` ending in "without a time", and, when open, a `form` with `input[name=t]`.

- [ ] **Step 1: Write the failing tests.** Append after the Task 3 block:

```js
  // ---- week strip ----
  btn('Current').click(); document.querySelector('[data-view=week]').click(); await sleep(20);
  ok(all('.week .strip .chip').length > 0, 'week strip shows unplaced chips');
  document.querySelector('.week .strip button[aria-label$="without a time"]').click(); await sleep(20);
  const wi = document.querySelector('.week .strip input');
  ok(wi && document.activeElement === wi, 'week add input focused');
  wi.value = 'Piano 45m'; wi.form.requestSubmit(); await sleep(100);
  const piano = db.activities.find(a => a.title === 'Piano');
  ok(piano?.duration === 45 && piano.start_time == null, 'week add creates an unplaced activity');
  document.querySelector('.week .strip input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
  ok(!document.querySelector('.week .strip input'), 'Esc closes week add');
  document.querySelector('[data-view=day]').click(); await sleep(20);
```

- [ ] **Step 2: Run the tests to check they fail.** Expected: FAIL `week strip shows unplaced chips`, then an `ERROR`.

- [ ] **Step 3: Rewrite `weekView`.**

```js
function weekView() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday(S.cursor), i));
  return [h('section', { class: 'card week fill' },
    h('div', { class: 'week-head' }, h('div'), days.map(s => {
      const t = tasksOn(s), fl = unplacedOn(s), label = fmt(s, { weekday: 'long' });
      return h('div', {},
        h('button', { class: 'dayhead' + (s === today() ? ' today' : ''), onclick: () => go('day', s) },
          h('b', {}, fmt(s, { weekday: 'short', day: 'numeric' })),
          h('small', {}, t.length ? `${progress(t)} tasks` : ' ')),
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
```

- [ ] **Step 4: Style it.** Append to the week section in `style.css`:

```css
.week-head > div { display: flex; flex-direction: column; min-width: 0; }
.strip { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0 4px 8px; }
.chip { min-height: 26px; max-width: 100%; padding: 2px 9px 2px 7px; gap: 5px; border-radius: 999px; font-size: 12px; background: var(--raised); }
.chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
.chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.strip button.icon { width: 26px; min-height: 26px; }
.strip button.icon .ic svg { width: 15px; height: 15px; }
.strip input { width: 100%; min-height: 30px; padding: 4px 8px; font-size: 13px; border-radius: 9px; }
```

- [ ] **Step 5: Run the tests to check they pass.** Expected: the week strip checks PASS.

- [ ] **Step 6: Commit.**

```bash
git add app.js style.css test/test.js
git commit -m "Week view: add and see unplaced activities under each day

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Leftover unplaced activities in the overdue banner

**Files:**
- Modify: `app.js` (`overdueBanner`, around line 199)
- Modify: `style.css` (after `.late li button`)
- Test: `test/test.js`

**Interfaces:**
- Consumes: `isDone`, `save`, `updTask`, `fmt`, `icon`.
- Produces: the DOM `.late li.late-act`, whose first button is "Today".

- [ ] **Step 1: Write the failing tests.** Append after the Task 4 block:

```js
  // ---- leftovers ----
  db.activities.push(fixture('oldp', 'Old plan', '2020-01-02', null, null, null), fixture('oldd', 'Old done', '2020-01-03', null, null, null));
  db.activity_done.push({ activity_id: 'oldd', date: '2020-01-03' });
  btn('Current').click(); document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  const late = document.querySelector('.late');
  ok(late?.textContent.includes('Old plan') && !late.textContent.includes('Old done'), 'leftover unplaced offered, done one not');
  document.querySelector('.late .late-act button').click(); await sleep(100);
  ok(db.activities.find(a => a.id === 'oldp').date === todayS, 'leftover moved to today');
```

- [ ] **Step 2: Run the tests to check they fail.** Expected: FAIL `leftover unplaced offered`.

- [ ] **Step 3: Rewrite `overdueBanner`.**

```js
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
```

- [ ] **Step 4: Style the dot.** Append after `.late li button { ... }`:

```css
.late-act .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); flex: none; }
```

- [ ] **Step 5: Run the tests to check they pass.** Expected: both leftovers checks PASS. The older `overdue banner` and `moved to today` checks still PASS (tasks are listed first).

- [ ] **Step 6: Commit.**

```bash
git add app.js style.css test/test.js
git commit -m "Offer unplaced activities from earlier days in the overdue banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Seed data, visual check and docs

**Files:**
- Modify: `test/seed.js`, `PRODUCT.md` (Capabilities), `DESIGN.md` (Components)

- [ ] **Step 1: Seed unplaced activities.** In `test/seed.js`, add to the `db.activities.push(` list:

```js
  { id: 'u1', title: 'Gym', color: '#e4572e', start_time: null, end_time: null, duration: 90, position: 1, date: t, repeat_days: null, repeat_until: null, skip_dates: [] },
  { id: 'u2', title: 'Call grandma', color: '#9b5de5', start_time: null, end_time: null, duration: 30, position: 2, date: t, repeat_days: null, repeat_until: null, skip_dates: [] },
  { id: 'u3', title: 'Revise history', color: '#4f6bff', start_time: null, end_time: null, duration: 120, position: 3, date: t, repeat_days: null, repeat_until: null, skip_dates: [] },
```

- [ ] **Step 2: Take screenshots.** Use `http://localhost:8765/?seed&clock` at 1280×800 and 390×844:
  - Day view, with the Unplaced panel open on phone (tap its summary).
  - The plan dialog (click "Plan the day").
  - The "Day planned" screen.
  - The Week view.

```bash
playwright-cli open "http://localhost:8765/?seed&clock" >/dev/null 2>&1; playwright-cli resize 1280 800 >/dev/null 2>&1; playwright-cli goto "http://localhost:8765/?seed&clock" >/dev/null 2>&1; sleep 3; playwright-cli screenshot --filename=day-wide.png
```

Look at every screenshot and check:
- Nothing overflows.
- The chips truncate with an ellipsis.
- The plan-strip hour labels don't collide.
- The phone dialog fits without horizontal scrolling.
- The hero nudge wraps cleanly on phone.
- Focus rings are visible when tabbing through the plan dialog.

Fix anything you find in `style.css`, then re-run the test suite.

- [ ] **Step 3: Update the docs.**
  - In `PRODUCT.md`, under Capabilities, add: "- Activities can be added to a day without a time (quick add on the day or in Week view, with an optional duration like `2h`). They sit in an Unplaced list until 'Plan the day' steps through them and gives each a time; leftovers from past days are offered in the overdue banner."
  - In `DESIGN.md`, under Components, add a short "### Unplaced & Plan the day" entry describing:
    - the side column (248px, hairline left rule) and the phone collapsible card;
    - checkboxes tinted with each activity's own colour;
    - the plan dialog's 28px display title, the 24px tabular time readout in a Night Ground well, and the horizontal day strip with the proposed block ringed in Bone;
    - the 32px "Day planned" moment.

- [ ] **Step 4: Run the full suite and update the graph.** Run the test command, which should show only the two baseline failures, then `graphify update .`.

- [ ] **Step 5: Commit.**

```bash
git add test/seed.js PRODUCT.md DESIGN.md style.css
git commit -m "Seed, polish and document floating activities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
