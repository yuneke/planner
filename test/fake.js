const db = { activities: [], activity_done: [], tasks: [], periods: [] };
window.__db = db;
class Q {
  constructor(t) { this.t = t; this.op = 'select'; this.f = []; }
  select() { return this; }
  insert(v) { this.op = 'insert'; this.v = v; return this; }
  update(v) { this.op = 'update'; this.v = v; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(k, v) { this.f.push(r => r[k] === v); return this; }
  in(k, vs) { this.f.push(r => vs.includes(r[k])); return this; }
  then(res, rej) {
    const m = r => this.f.every(f => f(r)); let data = null;
    if (this.op === 'select') data = structuredClone(db[this.t]);
    if (this.op === 'insert') {
      const row = { id: crypto.randomUUID(), done: false, date: null, period_id: null, ...structuredClone(this.v) };
      if (this.t === 'activities') Object.assign(row, { skip_dates: [], repeat_days: row.repeat_days ?? null, repeat_until: row.repeat_until ?? null, start_time: row.start_time + ':00', end_time: row.end_time + ':00' });
      db[this.t].push(row);
    }
    if (this.op === 'update') db[this.t].filter(m).forEach(r => Object.assign(r, structuredClone(this.v)));
    if (this.op === 'delete') db[this.t].splice(0, Infinity, ...db[this.t].filter(r => !m(r)));
    return Promise.resolve({ data, error: null }).then(res, rej);
  }
}
export const createClient = () => ({ from: t => new Q(t), auth: { onAuthStateChange(cb) { setTimeout(() => cb('INITIAL_SESSION', { user: {} })); }, signOut() {}, async signInWithPassword() { return {} }, async signUp() { return {} } } });
