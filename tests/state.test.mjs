import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, migrate, load, save, exportJson, importJson, KEY } from '../js/state.js';

const mem = (init = {}) => ({ d: { ...init }, getItem(k) { return k in this.d ? this.d[k] : null; }, setItem(k, v) { this.d[k] = String(v); } });

test('load() with garbage returns defaults', () => {
  const s = load(mem({ [KEY]: '{not json' }));
  assert.equal(s.xp, 0);
  assert.ok(Array.isArray(s.habits) && s.habits.length > 0);
  assert.ok(s.quests.main.length > 0);
  assert.equal(load(mem()).profile.currency, '€');
});

test('migrate fills missing keys keeping existing', () => {
  const s = migrate({ xp: 500, profile: { name: 'Darius' } });
  assert.equal(s.xp, 500);
  assert.equal(s.profile.name, 'Darius');
  assert.equal(s.profile.currency, '€');
  assert.ok(Array.isArray(s.log));
  assert.ok(s.counters);
});

test('save + load roundtrip, export/import', () => {
  const st = mem();
  const s = defaults(); s.xp = 42; s.leads.push({ id: 'a', name: 'Pizza X' });
  save(s, st);
  assert.equal(load(st).xp, 42);
  const back = importJson(exportJson(s));
  assert.equal(back.leads[0].name, 'Pizza X');
  assert.throws(() => importJson('nope'));
});

test('importJson rejects files that are not Hustle Quest backups', () => {
  assert.throws(() => importJson('{}'));
  assert.throws(() => importJson(JSON.stringify({ name: 'other app', settings: {} })));
  assert.throws(() => importJson(JSON.stringify({ state: { foo: 1 } })));
});

test('migrate normalises broken nested items', () => {
  const s = migrate({ xp: 1, habits: [{ id: 'h', name: 'x', target: 1 }], clients: [{ id: 'c', name: 'c' }], quests: null });
  assert.deepEqual(s.habits[0].log, {});
  assert.equal(s.clients[0].kcs.length, 8);
  assert.ok(s.quests.main.length > 0);
});

test('load keeps a copy of unreadable data before falling back', () => {
  const st = mem({ [KEY]: '{broken' });
  load(st);
  assert.ok(Object.keys(st.d).some(k => k.startsWith(KEY + '.bad-')));
});
