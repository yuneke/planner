const db = window.__db, d = new Date(), t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
db.activities.push(
  { id: 'a1', title: 'Gym', color: '#e4572e', start_time: '09:00:00', end_time: '11:00:00', date: '2026-10-01', repeat_days: [1, 2, 3, 5], repeat_until: null, skip_dates: [] },
  { id: 'a2', title: 'Maths', color: '#4f6bff', start_time: '16:00:00', end_time: '18:00:00', date: '2026-10-01', repeat_days: [1, 2, 3, 4, 5], repeat_until: null, skip_dates: [] },
  { id: 'a3', title: 'Football', color: '#2bb673', start_time: '18:30:00', end_time: '21:00:00', date: t, repeat_days: null, repeat_until: null, skip_dates: [] },
  { id: 'a4', title: 'Revision call', color: '#9b5de5', start_time: '10:00:00', end_time: '11:00:00', date: t, repeat_days: null, repeat_until: null, skip_dates: [] });
db.activity_done.push({ activity_id: 'a1', date: t });
db.periods.push({ id: 'p1', name: 'Half-term break', start_date: '2026-10-11', end_date: '2026-10-26' });
db.tasks.push(
  { id: 't1', title: 'Read 30 pages', done: true, date: t, period_id: null, position: 1 },
  { id: 't2', title: 'Sign paperwork', done: false, date: t, period_id: null, position: 2 },
  { id: 't3', title: 'Email coach', done: false, date: '2026-10-10', period_id: null, position: 3 },
  { id: 't4', title: 'Finish maths ch 1–5', done: false, date: null, period_id: 'p1', position: 4 },
  { id: 't5', title: 'Buy new boots', done: false, date: null, period_id: null, position: 5 });
setTimeout(() => document.dispatchEvent(new Event('visibilitychange')), 200);
if (location.hash) setTimeout(() => document.querySelector('[data-view=' + location.hash.slice(1) + ']').click(), 600);
// ?seed&clock pins the clock to 15:00 today, so "what's next" states can be captured.
if (new URLSearchParams(location.search).has('clock')) {
  const Real = Date, fixed = new Real(); fixed.setHours(15, 0, 0, 0);
  globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [fixed.getTime()])); } static now() { return fixed.getTime(); } };
}
