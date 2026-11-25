# Hustle Quest — design

## Why
User (Romania, Brăila/Galați; runs a client-acquisition agency per the "Make LIFE CHANGING progress" workshop) wants a daily phone app that keeps them accountable to the workshop system and gamifies the entrepreneur journey so hard it is addictive — plus mind/body/soul/learning growth. Samsung Android phone, Chrome.

## Goals
- Pixel-art RPG hero page: level, XP, gold, gems, Broke → Wealthy rank ladder (driven by real revenue), gear upgrades per rank.
- Stat radar (Mind, Body, Soul, Hustle, Craft, Wealth) scored on 14-day consistency.
- Quests: daily quests generated from workshop math ((4 − active clients) × 100 outreaches/day; 100/week at ≥4 clients), main quest line Bootcamp → Proving Ground → KCS, boss fights (1st client, 4 clients, KCS).
- Time-block day plan from the doc (client work 4–8, calls & in-person in business hours, warm outreach + lead gathering evenings, cold email prepped evening / lands business hours). Romania = EU → all outreach types allowed, cold email included.
- Lead list with Call button (tel: link) → logs attempt → outcome prompt on return. Quick +1 counters for call / DM / email / walk-in / warm.
- Clients: signed date, launch deadline (+7 days), 4h/day fulfillment, KCS builder (8 questions), project-math pricing helper, upsell prompt after KCS.
- Habits with streaks; end-of-day check-in with bonus loot.
- Dopamine: combo multiplier, crit XP, level-up animation, vibration, sound, daily chest, achievements, gold shop with user-defined real rewards.
- Stats page: weekly charts, activity heatmap, totals, best streaks.
- Data saved automatically on device (localStorage) + export/import backup file.
- Reminders via Google Calendar recurring time blocks (Samsung notifies), plus in-app notifications while open.

## Non-goals
- Reading the phone call log (impossible from web).
- Accounts, servers, sync across devices.

## Approach (chosen: 1)
1. Installable PWA on GitHub Pages + Google Calendar for reliable reminders. **Picked.** Installs today, easy updates.
2. Native APK via Capacitor — real local notifications, but requires Android SDK/JDK17 install and rebuilds per change.

## Builder calls
- Vanilla JS/HTML/CSS, no build step, single-page with bottom tab bar (Hero, Quests, Outreach, Habits, Stats). Service worker for offline.
- Pixel hero drawn on canvas from sprite arrays; outfit changes with rank.
- Currency default €, editable in settings.
- Code at `F:\Salvate dji 3\Pizza\hustle-quest`.
