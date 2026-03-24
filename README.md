# Sliceball 2

Live demo: https://sliceballninja.netlify.app/

![platform](https://img.shields.io/badge/platform-web_mobile-f28c28) ![runtime](https://img.shields.io/badge/runtime-vanilla_js-f7df1e) ![status](https://img.shields.io/badge/status-playable-5cb85c)

Sliceball 2 is a mobile-first endless arcade game about swiping wall-to-wall dashes through moving target balls while spikes and temporary wall hazards force tighter decisions.

## Quick Start

Open `index.html` in a browser.

This project ships with a prebuilt `game.js` bundle, so it runs directly from `file://` without a dev server.

If you change files under `src/`, rebuild the bundle with:

```powershell
npx --yes esbuild src\main.js --bundle --format=iife --platform=browser --outfile=game.js
```

## Gameplay

- The attacker starts attached to an arena wall.
- The timer does not begin until the first real dash.
- Each successful hit gives `+1 score`, `+1 coin`, increases combo, and resets the timer.
- Large target balls split into two smaller moving children when sliced.
- Minimum-size target balls explode instead of splitting.
- When the board is cleared, a fresh full-size target ball respawns in the center with a larger burst.
- One dash can slice multiple pre-existing target balls before a spike or temporary wall interrupts it.

## Physics Model

- Player hits use swept circle collision against every live target ball.
- Newly created children are not hittable by the same dash that created them.
- Spikes bounce physically with target balls instead of being forced away from them.
- Target balls also bounce off each other and off the arena walls.
- Temporary wall hazards are player-only blockers and do not affect target balls.

## Visual Notes

- The arena is a square playfield inside a portrait mobile layout.
- Target splits leave a cut-shell effect on top of the newly spawned children.
- Small target explosions use extra sparkles, embers, shards, glow rings, and screen feedback.
- Low time heats up the map visually.

## Project Layout

- `index.html`: portrait mobile shell, HUD, overlays
- `styles.css`: wood/jungle UI styling and overlay presentation
- `game.js`: active runtime, gameplay loop, rendering, collision handling, hazards
- `GAME_OVERVIEW.txt`: rebuild-focused spec for recreating the current game
- `src/`: older source files that are not the active runtime path for this build

## Persistence

- Coins, owned skins, selected skin, best score, tutorial flags, and screen shake settings persist in `localStorage`.
