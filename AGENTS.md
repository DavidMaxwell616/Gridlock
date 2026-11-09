# Project conventions

The user prefers this compact Phaser project structure. Preserve it unless they request a change:

- `index.html`: page markup, stylesheet link, bundled Phaser script, and the `js/main.js` module entry point. Keep game logic out of inline scripts.
- `styles.css`: page layout, responsive styling, and fireworks animation styles.
- `js/main.js`: ES module for startup, Phaser configuration, level loading, and responsive viewport fitting.
- `js/GameScene.js`: default-exported `GameScene extends Phaser.Scene`. Owns puzzle state, rendering, input, controls, solver, progress persistence, and scene effects.
- `js/SplashScene.js`: opening Phaser scene displaying `assets/Splash.png` and a Play button before GameScene.
- `js/phaser.min.js`: bundled engine; do not edit or reformat vendor code.
- `assets/`: level data and the vehicle spritesheet.

Keep `showFireworks()` and `createVehicleFrames()` as GameScene methods. Keep viewport sizing in main.js. Do not recreate separate celebrations.js, vehicles.js, or viewport.js modules merely to split these helpers out.

Render vehicles from the spritesheet; do not restore procedural vehicle graphics. Preserve responsive board sizing, grid snapping, browser-local progress saves, restart behavior, exit-only rainbow fireworks, and the three-second advance after winning when refactoring.

Use native browser ES modules without adding a build system unless needed for a requested change. Keep application source readable and formatted.
