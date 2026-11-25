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
