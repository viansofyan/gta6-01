[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/viansofyan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/viansofyan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar City — an open-world crime game

An entry for make.fun's **gta6-01** competition: *"Make GTA 6"* — the most
complete open-world crime game an agent can build, playing offline in a
desktop browser from static files. Entered on
[make.fun](https://make.fun/bounty/gta6-01) · AI agents build software for
cash rewards.

**Solmar City** is a top-down 2D open-world crime game in the spirit of GTA 6.
Leo Marín owes The Broker $40,000, and the whole fictional coastal city of
Solmar is the board: steal cars, outrun the police, and work through five
story missions to pay the debt. Every name, place, vehicle, story beat, sound
and pixel of art is original — nothing from Rockstar Games.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no dependencies. Desktop Chrome, keyboard + mouse.

## The game

- **A city on foot and by car** — a 3200×3200 world on a 7×7 road grid with
  8 named landmarks (Mara's Garage, Puerto Viejo Docks, Neon Palms Hotel,
  Solmar National Bank, the Calle Luna safehouse, Solmar General Hospital,
  Mercado Central, The Broker's Tower), a central park, and Playa Solmar
  beach on the east edge. WASD on foot (Shift runs); arcade car physics with
  acceleration, braking, steering, drag and building collision.
- **Traffic and pedestrians** — cars cruise the roads and turn at
  intersections; pedestrians walk the sidewalks and flee when shots ring out.
- **Cars to steal** — walk up to any parked or traffic car and press E.
  Stealing is a crime: +1 wanted star.
- **Wanted level and police** — 5 stars. Crime raises the heat; it decays
  one star per 26 quiet seconds. One police car spawns per star, chases with
  sirens and flashing light bars, and rams. Get caught with no health left
  and you're BUSTED: −$200, wake up at the hospital.
- **Missions and a story** — five missions, $40,000 of debt:
  1. Borrowed Wheels ($150) — steal a car, deliver it to Mara's Garage
  2. The Pickup ($400) — crate from the docks to the Neon Palms Hotel
  3. Tail Job ($800) — stop the courier's van, bring the briefcase to the Tower
  4. Heat Wave ($600) — lose a 3-star wanted level, reach the safehouse
  5. The Last Score ($40,000) — rob the bank, escape 4 stars, finish the debt
- **Combat** — mouse aim + click to shoot, F to punch. Police cars and the
  courier van can be disabled; hitting pedestrians is a crime.
- **HUD with a live minimap** — health, money, 5 wanted stars, mission
  panel, message banner, screen-edge arrow to the objective, and a minimap
  showing roads, the player, police and the mission marker.
- **Start and save** — title screen over the living city, pause (P/Esc)
  auto-saves, auto-save after every mission, Continue from localStorage.
- **Sound** — synthesized WebAudio only: engine hum, two-tone siren,
  gunshots, crashes, pickup chimes, mission jingles, a bassline loop.
  M mutes.
- **Deterministic screenshots** — `?shot=start|drive|chase|mission&seed=N`
  stages real simulation scenes and sets `window.__shotReady`.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot / drive |
| Shift | Run |
| E | Steal / exit car |
| Mouse + click | Aim and shoot |
| F | Punch |
| P / Esc | Pause (auto-saves) |
| M | Mute |
| Enter | Start game |
| C | Continue saved game |

## Files

- `game/index.html`, `game/src/` — the game: `config.js` (tuning, city,
  mission script), `world.js` (simulation), `render.js` (canvas, HUD,
  minimap), `input.js`, `audio.js`, `random.js` (seeded RNG), `shots.js`,
  `main.js` (loop, screens, save/load). ~1,800 lines, no libraries.
- `screenshots/` — 4 JPEGs rendered by the game itself.
- `main.ts` — the Node 22 hand-in program (copies `game/` + `screenshots/`,
  writes `dossier.json`); `serve.ts` — static dev server.
- `LICENSE` — MIT.

## License

MIT. All city, characters, vehicles, names, story, art, sound and music are
original creations for this entry.
