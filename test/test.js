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
  ok(document.querySelector('.sched-card .block').style.top === '120px', 'gym 9:00 at 120px');
  ok(document.querySelector('.legend .sched b').textContent === '0/1' && document.querySelector('.legend .tasks b').textContent === '1/1', 'ring legend counts');

  btn('Activity').click(); f = document.querySelector('#dlg form'); f.title.value = 'Bad'; f.start.value = '12:00'; f.end.value = '11:00'; f.requestSubmit(); await sleep(50);
  ok(document.querySelector('#dlg').open && db.activities.length === 1, 'end<start rejected, dialog stays open');
  document.querySelector('#dlg').close();

  const col = document.querySelector('.sched-card .col'), r = col.getBoundingClientRect();
  col.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: r.top + 7 * 60 + 20 }));
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
  btn('Today').click(); await sleep(20);
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
} catch (e) { out.push('ERROR ' + e.stack); }
document.querySelector('#out').textContent = 'RESULTS\n' + out.join('\n');
