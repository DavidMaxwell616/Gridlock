export default class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: "SplashScene" });
  }

  preload() {
    this.load.image("splash", "assets/Splash.png");
  }

  create() {
    this.cameras.main.setBackgroundColor("#ffdc00");
    const { width, height } = this.scale;
    if (this.textures.exists("splash")) {
      const image = this.add.image(width / 2, (height - 70) / 2, "splash");
      image.setScale(
        Math.min((width - 24) / image.width, (height - 82) / image.height),
      );
    } else {
      this.add
        .text(width / 2, height / 2, "GRIDLOCK", {
          fontFamily: "Arial",
          fontSize: "48px",
          color: "#c90000",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    const button = document.createElement("button");
    button.className = "splash-play";
    button.textContent = "Play";
    button.type = "button";
    document.getElementById("game").append(button);
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      document.body.classList.remove("splash-screen");
      window.dispatchEvent(new Event("resize"));
      this.scene.start("GameScene");
      document.getElementById("hint").focus({ preventScroll: true });
    };
    button.addEventListener("click", start);
    const onKey = (event) => {
      if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        start();
      }
    };
    this.input.keyboard.on("keydown", onKey);
    button.focus({ preventScroll: true });
    this.events.once("shutdown", () => {
      button.removeEventListener("click", start);
      button.remove();
      this.input.keyboard.off("keydown", onKey);
    });
  }
}
