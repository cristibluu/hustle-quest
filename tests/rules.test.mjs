import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outreachTarget, levelFromXp, rankFromRevenue, rollReward, streak, consistency, RANKS, STATS, addDays } from '../js/rules.js';

test('outreach target by clients', () => {
  assert.deepEqual(outreachTarget(0), { amount: 400, per: 'day' });
  assert.deepEqual(outreachTarget(3), { amount: 100, per: 'day' });
  assert.deepEqual(outreachTarget(4), { amount: 100, per: 'week' });
  assert.deepEqual(outreachTarget(6), { amount: 100, per: 'week' });
  assert.deepEqual(outreachTarget(-2), { amount: 400, per: 'day' });
});

test('levels', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(0).need, 100);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(99).into, 99);
  const l = levelFromXp(100 + 283);
  assert.equal(l.level, 3);
});

test('ranks', () => {
  assert.equal(RANKS.length, 6);
  assert.equal(rankFromRevenue(0).name, 'Broke');
  assert.equal(rankFromRevenue(2000).name, 'Closer');
  assert.equal(rankFromRevenue(1999).name, 'Hustler');
  assert.equal(rankFromRevenue(99999).name, 'Wealthy');
  assert.equal(rankFromRevenue(99999).next, null);
});

test('rewards: crit and combo', () => {
  const r = rollReward(10, 0, () => 0.05);
  assert.equal(r.crit, true);
  assert.equal(r.xp, 20);
  assert.equal(r.gold, 4);
  const n = rollReward(10, 5, () => 0.5);
  assert.equal(n.crit, false);
  assert.equal(n.xp, 15);
  assert.equal(rollReward(10, 50, () => 0.5).xp, 20);
});

test('streak handles gaps and same-day repeats', () => {
  assert.deepEqual(streak(['2026-11-23', '2026-11-24', '2026-11-24'], '2026-11-25'), { current: 2, best: 2 });
  assert.equal(streak(['2026-11-23', '2026-11-24', '2026-11-25'], '2026-11-25').current, 3);
  assert.equal(streak(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-25').current, 0);
  assert.equal(streak(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-25').best, 3);
  assert.deepEqual(streak([], '2026-11-25'), { current: 0, best: 0 });
  assert.equal(streak(['2026-02-28', '2026-03-01'], '2026-03-01').current, 2);
});

test('consistency over 14 days', () => {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays('2026-11-25', -i));
  assert.equal(consistency(days, '2026-11-25'), 50);
  assert.equal(consistency([], '2026-11-25'), 0);
  assert.equal(consistency(['2026-01-01'], '2026-11-25'), 0);
});

test('stats list', () => {
  assert.deepEqual(STATS.map(s => s.id), ['mind', 'body', 'soul', 'hustle', 'craft', 'wealth']);
});
