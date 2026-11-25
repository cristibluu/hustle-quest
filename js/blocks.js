// Daily time blocks from the workshop's "When to do which work" rules.
export function blocksFor(date = new Date(), activeClients = 0) {
  const wd = date.getDay();
  const weekend = wd === 0 || wd === 6;
  const b = [];
  b.push(activeClients > 0
    ? { s: '04:00', e: '08:00', name: 'Client fulfillment (4h deep work)', icon: '🛠️', kind: 'fulfil' }
    : { s: '05:00', e: '07:00', name: 'Learn + build your offer', icon: '🎓', kind: 'learn' });
  if (!weekend) {
    b.push({ s: '09:00', e: '12:00', name: 'Cold calling block', icon: '📞', kind: 'call' });
    b.push({ s: '12:00', e: '13:00', name: 'Lunch + walk', icon: '🥗', kind: 'body' });
    b.push({ s: '13:00', e: '17:00', name: 'In-person local outreach', icon: '🚪', kind: 'inperson' });
  } else {
    b.push({ s: '10:00', e: '14:00', name: 'In-person outreach (weekend)', icon: '🚪', kind: 'inperson' });
    b.push({ s: '15:00', e: '17:00', name: 'Gather new leads', icon: '🗂️', kind: 'leads' });
  }
  b.push({ s: '17:30', e: '18:30', name: 'Workout', icon: '🏋️', kind: 'body' });
  b.push({ s: '19:00', e: '20:30', name: 'Warm outreach', icon: '🤝', kind: 'warm' });
  b.push({ s: '20:30', e: '22:00', name: 'Gather leads + schedule cold emails/DMs for 9am', icon: '📧', kind: 'leads' });
  b.push({ s: '22:00', e: '22:30', name: 'End-of-day check-in', icon: '🌙', kind: 'checkin' });
  return b;
}

const mins = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
export function currentBlock(blocks, now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes();
  return blocks.find(b => t >= mins(b.s) && t < mins(b.e)) || null;
}
export function nextBlock(blocks, now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes();
  return blocks.find(b => mins(b.s) > t) || null;
}
export { mins };

// Recurring calendar file (.ics) with 5-minute alarms — import into Samsung/Google Calendar.
export function buildIcs(activeClients = 0) {
  const days = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
  const map = new Map(); // key s|e|name -> [BYDAY]
  for (const [code, wd] of Object.entries(days)) {
    const d = new Date(2026, 10, 22 + wd); // 22 Nov 2026 is a Sunday
    for (const b of blocksFor(d, activeClients)) {
      const k = `${b.s}|${b.e}|${b.icon} ${b.name}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(code);
    }
  }
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const p2 = n => String(n).padStart(2, '0');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hustle Quest//EN', 'CALSCALE:GREGORIAN'];
  let i = 0;
  for (const [k, byday] of map) {
    const [s, e, name] = k.split('|');
    // first date on/after today that matches one of the event's weekdays
    const want = new Set(byday.map(c => days[c]));
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (!want.has(first.getDay())) first.setDate(first.getDate() + 1);
    const y = first.getFullYear(), mo = p2(first.getMonth() + 1), da = p2(first.getDate());
    lines.push('BEGIN:VEVENT', `UID:hq-${i++}-${stamp}@hustlequest`, `DTSTAMP:${stamp}`,
      `DTSTART:${y}${mo}${da}T${s.replace(':', '')}00`, `DTEND:${y}${mo}${da}T${e.replace(':', '')}00`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday.join(',')}`, `SUMMARY:${name}`,
      'BEGIN:VALARM', 'TRIGGER:-PT5M', 'ACTION:DISPLAY', `DESCRIPTION:${name}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
