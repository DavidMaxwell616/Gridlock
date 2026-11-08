GRIDLOCK - PHASER 3.90

Extract the ZIP. No npm or build step required.

Run a static web server from this folder, for example:
python3 -m http.server 8000

Then open http://localhost:8000 in your browser.

Drag cars along their length and slide the red car out to the right.
Includes 40 challenges (10 per difficulty), hints, undo, restart, keyboard controls, and locally saved best scores. Phaser is bundled locally.

Puzzles progress by shortest solution length, counting the final exit as one move:
Beginner: 3-10 moves; Intermediate: 11-18; Advanced: 19-26; Expert: 27-34.
Some adjacent puzzles share a move count and provide a different board at that difficulty.
Best scores use a new storage key for this deck, so scores from the old 16-level deck are not applied to different puzzles.

Validate the deck and game navigation with Node.js: node scripts/check-levels.cjs

Files: index.html (game source), styles.css (styles), levels.json (puzzles), phaser.min.js (engine).

Vehicle artwork is drawn in vehicles.js: 2-space cars and 3-space trucks with colors and molded shapes based on the supplied toy reference.
