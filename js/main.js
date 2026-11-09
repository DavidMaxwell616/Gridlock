import GameScene from "./GameScene.js";
// Reserve room for the game controls before sizing the board.
function fitGameViewport(game) {
  const board = document.getElementById("game");
  const section = board.parentElement;
  const controls = section.querySelector(".controls");
  const message = document.getElementById("message");
  let frame;

  function outerHeight(element) {
    const style = getComputedStyle(element);
    return (
      element.getBoundingClientRect().height +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom)
    );
  }

  function resize() {
    frame = null;
    // Document coordinates keep scrolling from changing the board size.
    const top = board.getBoundingClientRect().top + window.scrollY;
    const available =
      window.innerHeight -
      top -
      outerHeight(controls) -
      outerHeight(message) -
      16;
    // Very short windows may scroll, rather than make the puzzle unusable.
    const height = Math.max(160, available);
    const width = Math.min(section.clientWidth, (height * 560) / 490);
    const value = `${width}px`;
    if (board.style.width !== value) {
      board.style.maxWidth = "none";
      board.style.width = value;
      board.style.height = `${(width * 490) / 560}px`;
      game.scale.refresh();
    }
  }

  function schedule() {
    if (frame == null) frame = requestAnimationFrame(resize);
  }

  const observer = new ResizeObserver(schedule);
  [section, controls, message, document.querySelector("header")].forEach(
    (element) => observer.observe(element),
  );
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  document.fonts?.ready.then(schedule);
  schedule();
}

async function startGame() {
  try {
    const response = await fetch("assets/levels.json");
    if (!response.ok) throw new Error("Could not load levels");
    const levels = await response.json();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game",
      width: 560,
      height: 490,
      backgroundColor: "#101b26",
      antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: new GameScene(levels),
    });
    fitGameViewport(game);
  } catch (error) {
    console.error(error);
    document.getElementById("message").textContent =
      "Could not load the game. Please refresh.";
  }
}
startGame();
