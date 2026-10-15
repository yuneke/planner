const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
const all = s => [...document.querySelectorAll(s)];
const btn = t => all('button').find(b => b.textContent === t);
window.alert = m => out.push('alert: ' + m);
window.confirm = () => true;
const db = window.__db;
const d = new Date(), todayS = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const titles = () => all('.sched-card .block b').map(b => b.textContent);
try {
  await sleep(300);
  let f = document.querySelector('.taskcard form'); f.t.value = 'Read 30 pages'; f.requestSubmit(); await sleep(100);
  ok(all('.taskcard li').some(li => li.textContent.includes('Read 30 pages')), 'task added');
  ok(document.activeElement?.name === 't', 'focus stays in add box');
  document.querySelector('.taskcard li input').click(); await sleep(100);
  ok(db.tasks[0].done === true, 'task ticked');

  btn('Activity').click();
  f = document.querySelector('#dlg form'); f.title.value = 'Gym'; f.start.value = '09:00'; f.end.value = '11:00';
  f.querySelectorAll('[name=rep]').forEach(c => c.checked = true); f.requestSubmit(); await sleep(100);
  ok(all('.sched-card .block').length === 1, 'activity block shown');
  ok(document.querySelector('.sched-card .block').style.top === '0%', 'gym 9:00 at top of 09-23 timeline');
  ok(document.querySelector('.legend .sched b').textContent === '0/1' && document.querySelector('.legend .tasks b').textContent === '1/1', 'ring legend counts');

  btn('Activity').click(); f = document.querySelector('#dlg form'); f.title.value = 'Bad'; f.start.value = '12:00'; f.end.value = '11:00'; f.requestSubmit(); await sleep(50);
  ok(document.querySelector('#dlg').open && db.activities.length === 1, 'end<start rejected, dialog stays open');
  document.querySelector('#dlg').close();

  const col = document.querySelector('.sched-card .col'), r = col.getBoundingClientRect();
  col.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: r.top + (14 * 60 + 20 - 540) / 840 * r.height }));
  f = document.querySelector('#dlg form'); ok(f.start.value === '14:00' && f.end.value === '15:00', 'tap prefills hour: ' + f.start.value + '-' + f.end.value);
  f.title.value = 'Maths'; f.requestSubmit(); await sleep(100);
  ok(all('.sched-card .block').length === 2, 'tap-created activity');

  document.querySelector('[data-view=week]').click(); await sleep(50);
  ok(all('.week .block').length >= 7, 'week shows repeats: ' + all('.week .block').length);
  document.querySelector('[data-view=month]').click(); await sleep(50);
  ok(all('.month .cell .dots i').length >= 27, 'month dots: ' + all('.month .cell .dots i').length);

  document.querySelector('[data-view=day]').click();
  all('.sched-card .block').find(b => b.textContent.includes('Gym')).click();
  f = document.querySelector('#dlg form'); f.querySelector('[value=this]').checked = true; f.title.value = 'Gym short'; f.end.value = '10:00'; f.requestSubmit(); await sleep(100);
  ok(db.activities.find(a => a.title === 'Gym').skip_dates.length === 1, 'this-day edit skips series day');
  ok(titles().includes('Gym short') && !titles().includes('Gym'), 'edited occurrence replaces series today: ' + titles());
  document.querySelector('#next').click(); await sleep(20);
  ok(titles().includes('Gym'), 'next day still has series');
  document.querySelector('.sched-card .block input').click(); await sleep(100);
  ok(db.activity_done.length === 1 && document.querySelector('.sched-card .block.done'), 'activity ticked done');

  db.tasks.push({ id: 'old', title: 'Sign paperwork', done: false, date: '2020-01-01', period_id: null, position: 1 });
  document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  ok(document.body.textContent.includes('1 unfinished from earlier days'), 'overdue banner');
  document.querySelector('.late button').click(); await sleep(100);
  ok(db.tasks.find(t => t.id === 'old').date === todayS, 'moved to today');

  btn('Period').click(); f = document.querySelector('#dlg form'); f.name.value = 'Half-term'; f.start.value = todayS; f.requestSubmit(); await sleep(100);
  btn('Current').click(); await sleep(20);
  ok(document.body.textContent.includes('Half-term · day 1 of 17'), 'period strip');
  const goalForm = all('form.add').find(x => x.t.placeholder === 'Add a goal…'); goalForm.t.value = 'Finish ch 1-5'; goalForm.requestSubmit(); await sleep(100);
  ok(document.querySelector('.legend .goals b').textContent === '0/1', 'goal added');

  const inbox = document.querySelector('#lists form.add'); inbox.t.value = 'Buy shoes'; inbox.requestSubmit(); await sleep(100);
  ok(db.tasks.find(t => t.title === 'Buy shoes').date == null, 'inbox task');
  all('#lists .grow').find(s => s.textContent === 'Buy shoes').click(); f = document.querySelector('#dlg form'); f.date.value = todayS; f.requestSubmit(); await sleep(100);
  ok(all('.taskcard .grow').some(s => s.textContent === 'Buy shoes'), 'inbox task scheduled');

  const before = all('.taskcard .grow').map(s => s.textContent); all('.taskcard button[title="Move down"]')[0].click(); await sleep(100);
  const after = all('.taskcard .grow').map(s => s.textContent); ok(after[0] === before[1] && after[1] === before[0], 'reorder');

  document.querySelector('#next').click(); await sleep(20);
  all('.sched-card .block').find(b => b.textContent.includes('Gym')).click(); btn('Delete').click(); await sleep(100);
  ok(!db.activities.some(a => a.title === 'Gym') && titles().every(t => t !== 'Gym'), 'series deleted');
  ok(document.documentElement.scrollHeight <= innerHeight + 1, 'page fits the viewport: ' + document.documentElement.scrollHeight + '/' + innerHeight);
  ok(document.querySelector('#lists .taskcard'), 'tasks card lives under Inbox and Periods');
  ok(document.querySelector('#todayBtn').textContent.trim() === 'Current', 'nav says Current');

  // ---- floating activities ----
  const schedTotal = () => +document.querySelector('.legend .sched b').textContent.split('/')[1] || 0;
  btn('Current').click(); await sleep(20);
  const before1 = schedTotal();
  db.activities.push({ id: 'f1', title: 'Swim', color: '#3bd6ff', start_time: null, end_time: null, duration: 60, position: 1, date: todayS, repeat_days: null, repeat_until: null, skip_dates: [] });
  document.dispatchEvent(new Event('visibilitychange')); await sleep(100);
  ok(!titles().includes('Swim'), 'unplaced activity stays off the timeline');
  ok(schedTotal() === before1 + 1, 'ring counts unplaced as not done: ' + schedTotal());

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
} catch (e) { out.push('ERROR ' + e.stack); }
document.querySelector('#out').textContent = 'RESULTS\n' + out.join('\n');
