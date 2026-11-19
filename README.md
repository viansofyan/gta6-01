# Solmar City

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/viansofyan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/viansofyan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). You are Leo Marín,
a driver who owes The Broker $40,000. Take the city back, job by job, across
five story missions — stealing cars, losing the heat, and pulling the last
score — in a sun-soaked city you can cross on foot and by car.

Everything here is original: the city, the characters, the vehicles, the
names, the story, the art and the synthesised sound. Nothing from Rockstar
Games or any other commercial game.

## What is in the game

- A 3200 by 3200 city on a 7 by 7 road grid: 48+ buildings, eight named
  landmarks (Mara's Garage, Puerto Viejo Docks, Neon Palms Hotel, Solmar
  National Bank, the Safehouse on Calle Luna, Solmar General Hospital,
  Mercado Central, The Broker's Tower), a central park with a pond, and
  Playa Solmar beach and water on the east edge.
- Driving and walking with arcade car physics, a following camera, 13
  traffic cars and 26 pedestrians who flee from gunfire and the police.
- Car stealing (E), a five-star wanted system with police interceptors
  that chase, ram and lose you, and a BUSTED flow with a $200 fine and a
  hospital respawn.
- Five story missions with intro text, an objective panel, a pulsing
  diamond marker with a light beam, and a screen-edge arrow with the
  distance to the target. Completing the last one pays the $40,000 debt.
- Combat: a pistol aimed with the mouse, punching with F, stalled police
  cars and courier vans, and cars that push each other apart on impact.
- A HUD with a health bar, money, wanted stars, a mission panel, a
  message banner and a live 200 by 200 minimap.
- Title, pause, busted and story-complete screens, automatic saving after
  every mission, and a save you can continue with C.
- Synthesised WebAudio sound only: engine hum, a two-tone siren, gunshots,
  crashes, pickup chimes, mission jingles, a busted sting and a bassline
  loop. M toggles mute.

## How to run it

Play it locally with the dev server (Node 22, standard library only):

```sh
node serve.ts
```

Then open http://localhost:8080/game/index.html in desktop Chrome.

Hand the entry in with the hand-in program:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` there.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk, or drive when in a car |
| Shift | Run on foot |
| E | Steal a nearby car / get out of a car |
| Mouse click | Fire the pistol at the mouse |
| F | Punch |
| P or Esc | Pause (auto-saves) |
| C | Continue a saved game from the title screen |
| M | Mute / unmute |
| Enter | Start |

## Missions

1. **Borrowed Wheels** — steal a car and drive it to Mara's Garage. Pays $150.
2. **The Pickup** — collect a crate at the docks and deliver it to the Neon Palms Hotel. Pays $400.
3. **Tail Job** — stall the courier's van, take the briefcase, deliver it to The Broker's Tower. Pays $800.
4. **Heat Wave** — lose a three-star wanted level, then reach the safehouse. Pays $600.
5. **The Last Score** — rob the bank, then escape with four stars to the safehouse. Pays $40,000.

## File layout

- `main.ts` — the hand-in program.
- `serve.ts` — the static dev server.
- `game/index.html` — the only page; loads the game as modules.
- `game/src/config.js` — tuning numbers, the city layout, the mission script.
- `game/src/random.js` — the seeded random-number generator.
- `game/src/world.js` — the whole simulation (player, cars, traffic, pedestrians, police, missions, wanted level, combat).
- `game/src/render.js` — all canvas drawing: the city, the HUD, the minimap.
- `game/src/input.js` — keyboard and mouse state.
- `game/src/audio.js` — synthesised WebAudio sound.
- `game/src/shots.js` — the deterministic staged scenes for screenshots.
- `game/src/main.js` — the game loop, the screens, saving and loading.
- `screenshots/` — four renders of the game itself.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
