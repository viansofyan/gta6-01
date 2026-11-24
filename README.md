# Solmar City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/viansofyan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/viansofyan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[Make GTA 6 bounty](https://make.fun/c/gta6-01) on make.fun. You are Leo
Marín, a driver in the sun-soaked city of Solmar who owes The Broker
$40,000. Steal cars, outrun the police, and work five story missions to
pay the debt — or just cruise the city in free roam.

Everything is original: the city, the characters, the vehicles, the names,
the story, the art and the synthesised sound. Nothing from Rockstar Games.

## Play

The game runs offline in a desktop browser from static files, keyboard and
mouse, no network request at runtime.

```sh
node serve.ts
# open http://localhost:8080/game/index.html
```

Or open `game/index.html` directly from the files. The hand-in program
writes the entry dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D | Walk, drive, steer |
| Shift | Run on foot |
| E | Steal / enter a car, exit a car |
| Mouse + click | Aim and fire the pistol |
| F | Punch |
| P or Esc | Pause (auto-saves) |
| C | Continue a saved game from the title screen |
| M | Mute |

## Missions

1. **Borrowed Wheels** — steal a car and drive it to Mara's Garage. Pays $150.
2. **The Pickup** — collect a crate at Puerto Viejo Docks, deliver it to the
   Neon Palms Hotel. Pays $400.
3. **Tail Job** — stop the courier's van, take the briefcase, deliver it to
   The Broker's Tower. Pays $800.
4. **Heat Wave** — lose a 3-star wanted level, then reach the safehouse on
   Calle Luna. Pays $600.
5. **The Last Score** — rob Solmar National Bank, escape with 4 stars to the
   safehouse. Pays $40,000 and clears the debt.

Crimes raise your wanted level (up to 5 stars); each star decays after 26
quiet seconds. One police cruiser spawns per star and chases you. Get
busted and you pay a $200 fine and wake up at Solmar General Hospital.
Progress auto-saves after every mission.

## The city

A 3200×3200 city on a 7×7 road grid: 56 buildings including eight named
landmarks (Mara's Garage, Puerto Viejo Docks, Neon Palms Hotel, Solmar
National Bank, the Safehouse on Calle Luna, Solmar General Hospital,
Mercado Central, The Broker's Tower), a central park with a pond, and Playa
Solmar beach and water along the east edge. Thirteen traffic cars cruise
the roads and twenty-six pedestrians walk the sidewalks.

## File layout

```text
main.ts            hand-in program (writes dossier.json)
serve.ts           static dev server (port 8080)
vendor/            make.fun kit library (untouched)
game/
  index.html       the only page
  src/
    config.js      tuning, city layout, mission script
    random.js      seeded RNG
    world.js       simulation: player, traffic, police, missions, combat
    render.js      canvas drawing, HUD, minimap
    input.js       keyboard and mouse state
    audio.js       synthesised WebAudio sound
    shots.js       deterministic staged scenes for screenshots
    main.js        game loop, screens, saving, debug handle
screenshots/       four renders of the game (seed 7)
```

## License

MIT — see `LICENSE`.
