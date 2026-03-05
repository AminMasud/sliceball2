# Line-Slice Balls

Quick static web demo for a turn-based line-hit physics game.

## Run

Open `index.html` in a browser.

This project ships with a prebuilt `game.js` bundle so it can run when opened directly from `file://` in a browser.

If you change files under `src/`, rebuild the bundle with:

`npx --yes esbuild src\\main.js --bundle --format=iife --platform=browser --outfile=game.js`

## Rules in This MVP

- The player places two defenders first, then one attacker in the lower half.
- The CPU placement is hidden until the player finishes setup, then it is placed randomly in the upper half.
- The two defenders are always the only pieces connected by the line.
- Any piece can move on its turn, but only the attacker can score.
- A point counts only when the attacker crosses both its own defender line and the opponent defender line in the same shot.
- First side to 3 points wins.

## Controls

- Tap two positions for defenders, then one position for the triangle attacker.
- Tap any of your placed pieces to select it for the turn.
- Drag backward to set direction and power.
- Release to shoot.

## Notes

- The demo uses custom lightweight physics on a 2D canvas.
- Balls stay where they land, so defender movement changes the line over time.
