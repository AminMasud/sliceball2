# Sliceball 2

Live demo: https://sliceballninja.netlify.app/

![platform](https://img.shields.io/badge/platform-web_mobile-f28c28) ![runtime](https://img.shields.io/badge/runtime-vanilla_js-f7df1e) ![status](https://img.shields.io/badge/status-playable-5cb85c)

Sliceball 2 is a mobile-first endless arcade game about swiping wall-to-wall dashes through a shrinking center core while spikes and temporary wall hazards force tighter decisions.

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
- Each clean hit on the center core gives `+1 score`, `+1 coin`, resets the timer, and reveals the next smaller target under the slice.
- When the target reaches minimum size, it splits apart, disappears, and a fresh full-size core respawns.
- Spikes and temporary wall hazards unlock later in the run and force misses if they connect before a successful core hit.

## Controls

- Touch anywhere on the arena and drag to choose a wall-to-wall dash.
- Release to launch.
- Reposition off the walls and aim through the center before the timer expires.

## Physics Model

- Core hits use swept circle collision, so high-speed dashes still register correctly.
- Spike contact is resolved as an immediate rebound to the launch wall, and spikes are kept away from the visible target area.
- Temporary wall hazards use line-segment collision instead of projectile motion.
- Collision priority is based on earliest impact during the dash step instead of fixed check order.

## Project Layout

- `index.html`: portrait mobile shell, HUD, overlays
- `styles.css`: wood/jungle UI styling and overlay presentation
- `game.js`: active runtime, gameplay loop, rendering, collision handling, hazards
- `src/`: older source files that are not the active runtime path for this build

## Current Build Notes

- Arena is a square playfield inside a portrait layout.
- The center target starts large, shrinks through layered slices, then respawns as a new orb after the minimum-size cut.
- Difficulty ramps mainly through the shrinking core plus hazard unlocks rather than extra blocker pieces.
- The first run includes a one-time reposition hint so players understand they can move to a different wall spot before attacking.
- Coins, skins, best score, and tutorial flags persist in `localStorage`.
