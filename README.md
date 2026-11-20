# niffy_coach

A chess coach for returning competitors preparing for 5-minute blitz and 10-minute rapid. It builds opening, tactical, middlegame and endgame exercises from your completed games. Stockfish runs in a browser worker.

## Start training

1. Open the project's GitHub Pages site at `https://niffie-code.github.io/niffy_coach/`.
2. In **Games**, enter a Chess.com or Lichess username and import recent games. Keep the tab open while the engine analyzes them.
3. In **Study**, solve the four-position diagnostic or select a position from your games. For calculation drills, enter your candidate, the opponent’s reply and your continuation.
4. Play a training game in **Practice**. **My week** tracks your schedule and unaided recall by time control.

This edition saves training in the browser. Open **Your training profile** to move progress between devices or use the existing private coach for automatic sync. See the [training and data guide](docs/TRAINING.md).

## Run locally

Use Node.js 22 or newer. There are no package dependencies.

```sh
npm start
```

Open `http://127.0.0.1:4326/niffy_coach/`. Run `npm test` to check lesson positions, import and backup behavior, and the engine asset. With Chrome installed, `node tools/browser-check.mjs` exercises the chessboard, Stockfish, review and practice flows. On Linux or macOS set `CHROME_PATH` to the browser executable.

[Publishing and troubleshooting](docs/DEPLOYMENT.md) · [Third-party notices and source](site/credits.txt)
