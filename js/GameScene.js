const $ = (id) => document.getElementById(id);
const names = ["Beginner", "Intermediate", "Advanced", "Expert"];
const LEVELS_PER_TIER = 10;
const BESTS_KEY = "gridlock-bests-v2";
const PROGRESS_KEY = "gridlock-progress-v2";
const C = 76,
  OX = 38,
  OY = 22;
export default class GameScene extends Phaser.Scene {
  constructor(levels) {
    super({ key: "GameScene" });
    this.levels = levels;
    this.current = 0;
    this.cars = [];
    this.history = [];
    this.moves = 0;
    this.won = false;
    this.selected = -1;
    this.drag = null;
    this.bests = {};
    this.nextLevelTimer = null;
    this.hintTimer = null;
    this.clearFireworks = null;
    try {
      this.bests = JSON.parse(localStorage.getItem(BESTS_KEY) || "{}");
    } catch (e) {}
  }
  positions() {
    return this.cars.map((c) => c.p);
  }
  occupancy(s = this.positions(), exclude = -1) {
    let a = Array(36).fill(-1);
    this.cars.forEach((c, i) => {
      if (i === exclude) return;
      for (let k = 0; k < c.l; k++)
        a[c.h ? c.f * 6 + s[i] + k : (s[i] + k) * 6 + c.f] = i;
    });
    return a;
  }
  limits(i, s = this.positions()) {
    let c = this.cars[i],
      a = this.occupancy(s, i),
      lo = s[i],
      hi = s[i];
    while (lo > 0 && a[c.h ? c.f * 6 + lo - 1 : (lo - 1) * 6 + c.f] < 0) lo--;
    while (
      hi + c.l < 6 &&
      a[c.h ? c.f * 6 + hi + c.l : (hi + c.l) * 6 + c.f] < 0
    )
      hi++;
    return [lo, hi];
  }
  clearExit(s = this.positions()) {
    return this.limits(0, s)[1] === 4;
  }
  solve() {
    let start = this.positions(),
      q = [start],
      parents = [null],
      seen = new Set([start.join("")]);
    for (let head = 0; head < q.length; head++) {
      let s = q[head];
      if (this.clearExit(s)) {
        let path = [];
        let n = head;
        while (parents[n]) {
          let p = parents[n];
          path.push([p[1], q[n][p[1]]]);
          n = p[0];
        }
        return path.reverse();
      }
      if (q.length > 180000) return null;
      this.cars.forEach((c, i) => {
        let [lo, hi] = this.limits(i, s);
        for (let p = lo; p <= hi; p++) {
          if (p === s[i]) continue;
          let t = s.slice();
          t[i] = p;
          let key = t.join("");
          if (!seen.has(key)) {
            seen.add(key);
            q.push(t);
            parents.push([head, i]);
          }
        }
      });
    }
    return null;
  }
  updateUI() {
    $("moves").textContent = this.moves;
    $("par").textContent = this.levels[this.current].par;
    $("best").textContent = this.bests[this.current] || "—";
    $("difficulty").textContent =
      names[Math.floor(this.current / LEVELS_PER_TIER)].toUpperCase() +
      " / CHALLENGE " +
      String((this.current % LEVELS_PER_TIER) + 1).padStart(2, "0");
    document.querySelectorAll(".levels button").forEach((b, i) => {
      b.hidden =
        Math.floor(i / LEVELS_PER_TIER) !==
        Math.floor(this.current / LEVELS_PER_TIER);
      b.classList.toggle("active", i === this.current);
      b.classList.toggle("done", !!this.bests[i]);
    });
  }
  cancelCelebration() {
    clearTimeout(this.nextLevelTimer);
    this.nextLevelTimer = null;
    if (this.clearFireworks) this.clearFireworks();
    this.clearFireworks = null;
  }
  saveProgress() {
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          level: this.current,
          layout: this.levels[this.current].cars,
          positions: this.positions(),
          history: this.history,
          moves: this.moves,
          won: this.won,
        }),
      );
    } catch (e) {}
  }
  resumeProgress() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    } catch (e) {}
    const validLevel =
      saved &&
      Number.isInteger(saved.level) &&
      saved.level >= 0 &&
      saved.level < this.levels.length;
    if (
      !validLevel ||
      JSON.stringify(saved.layout) !==
        JSON.stringify(this.levels[saved.level].cars)
    ) {
      this.loadLevel(0);
      return;
    }
    this.loadLevel(saved.level);
    const validBoard = (state) => {
      if (!Array.isArray(state) || state.length !== this.cars.length)
        return false;
      const occupied = new Set();
      for (let i = 0; i < this.cars.length; i++) {
        const c = this.cars[i],
          p = state[i];
        if (!Number.isInteger(p) || p < 0 || p + c.l > 6) return false;
        for (let k = 0; k < c.l; k++) {
          const cell = c.h ? c.f * 6 + p + k : (p + k) * 6 + c.f;
          if (occupied.has(cell)) return false;
          occupied.add(cell);
        }
      }
      return true;
    };
    if (
      !validBoard(saved.positions) ||
      !Array.isArray(saved.history) ||
      !saved.history.every(validBoard) ||
      !Number.isInteger(saved.moves) ||
      saved.moves !== saved.history.length ||
      typeof saved.won !== "boolean"
    )
      return;
    if (saved.won) {
      this.loadLevel((saved.level + 1) % this.levels.length);
      return;
    }
    this.cars.forEach((c, i) => (c.p = saved.positions[i]));
    this.history = saved.history;
    this.moves = saved.moves;
    this.updateUI();
    this.draw();
    $("message").textContent =
      "Progress restored. Keep clearing the red car’s lane.";
    this.saveProgress();
  }
  loadLevel(n) {
    clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.cancelCelebration();
    this.current = n;
    let ci = 0,
      ti = 0;
    this.cars = this.levels[n].cars.map(([h, f, p, l], i) => ({
      h,
      f,
      p,
      l,
      texture:
        i === 0
          ? "red-car"
          : l === 3
            ? "truck-" + (ti++ % 4)
            : "car-" + (ci++ % 10),
    }));
    this.history = [];
    this.moves = 0;
    this.won = false;
    this.selected = -1;
    this.drag = null;
    $("tier").value = names[Math.floor(n / LEVELS_PER_TIER)];
    $("message").textContent =
      "Drag a car along its lane. Get the red car to the exit.";
    this.updateUI();
    this.draw();
    this.saveProgress();
  }
  restartLevel() {
    if (!this.levels || !this) return;
    this.loadLevel(this.current);
    $("message").textContent = "Level restarted. Drag a car along its lane.";
  }
  win() {
    this.won = true;
    this.drag = null;
    this.selected = -1;
    if (!this.bests[this.current] || this.moves < this.bests[this.current])
      this.bests[this.current] = this.moves;
    try {
      localStorage.setItem(BESTS_KEY, JSON.stringify(this.bests));
    } catch (e) {}
    $("message").textContent =
      "Clear road! Escaped in " +
      this.moves +
      " moves. " +
      (this.moves <= this.levels[this.current].par
        ? "Perfect solution!"
        : "Try again to beat your score.");
    this.updateUI();
    this.draw();
    $("message").textContent += " Next level in 3 seconds…";
    this.clearFireworks = this.showFireworks();
    this.nextLevelTimer = setTimeout(
      () => this.loadLevel((this.current + 1) % this.levels.length),
      3000,
    );
    this.saveProgress();
  }
  move(i, p) {
    if (this.won) return;
    p = Math.round(p);
    let c = this.cars[i];
    if (i === 0 && p > 4 && this.limits(0)[1] === 4) {
      this.history.push(this.positions());
      this.moves++;
      this.win();
      return;
    }
    let [lo, hi] = this.limits(i);
    p = Phaser.Math.Clamp(p, lo, hi);
    if (p !== c.p) {
      this.history.push(this.positions());
      c.p = p;
      this.moves++;
      $("message").textContent = "Keep clearing the red car’s lane.";
      this.updateUI();
      this.saveProgress();
    }
    this.draw();
  }
  undo() {
    if (this.history.length) {
      this.cancelCelebration();
      let s = this.history.pop();
      this.cars.forEach((c, i) => (c.p = s[i]));
      this.moves--;
      this.won = false;
      this.selected = -1;
      $("message").textContent = "Move undone.";
      this.updateUI();
      this.draw();
      this.saveProgress();
    }
  }
  preload() {
    this.load.image("realistic-vehicles", "assets/vehicles-realistic.png");
  }
  create() {
    this.g = this.add.graphics();
    this.createVehicleFrames();
    this.vehicles = this.add.container();
    this.input.on("pointerdown", (p) => {
      if (this.won) return;
      let x = Math.floor((p.x - OX) / C),
        y = Math.floor((p.y - OY) / C);
      let i = this.cars.findIndex((c) =>
        c.h
          ? y === c.f && x >= c.p && x < c.p + c.l
          : x === c.f && y >= c.p && y < c.p + c.l,
      );
      if (i < 0) return;
      this.selected = i;
      this.drag = {
        i,
        start: this.cars[i].p,
        at: this.cars[i].h ? p.x : p.y,
        offset: 0,
      };
      this.draw();
    });
    this.input.on("pointermove", (p) => {
      if (!this.drag) return;
      let c = this.cars[this.drag.i],
        [lo, hi] = this.limits(this.drag.i);
      this.drag.offset = Phaser.Math.Clamp(
        Math.round(((c.h ? p.x : p.y) - this.drag.at) / C),
        lo - this.drag.start,
        (this.drag.i === 0 && hi === 4 ? 6 : hi) - this.drag.start,
      );
      this.draw();
    });
    const finishDrag = () => {
      if (!this.drag) return;
      let d = this.drag;
      this.drag = null;
      this.move(d.i, Math.round(d.start + d.offset));
    };
    this.input.on("pointerup", finishDrag);
    this.input.on("pointerupoutside", finishDrag);
    this.input.keyboard.on("keydown", (e) => {
      if (e.key.toLowerCase() === "u") this.undo();
      if (e.key.toLowerCase() === "r") {
        this.restartLevel();
        return;
      }
      if (this.selected < 0 || this.won) return;
      let c = this.cars[this.selected],
        v = c.h
          ? e.key === "ArrowRight"
            ? 1
            : e.key === "ArrowLeft"
              ? -1
              : 0
          : e.key === "ArrowDown"
            ? 1
            : e.key === "ArrowUp"
              ? -1
              : 0;
      if (v) {
        e.preventDefault();
        this.move(this.selected, c.p + v);
      }
    });
    this.bindControls();
    this.resumeProgress();
  }
  draw() {
    let g = this.g;
    g.clear();
    this.vehicles.removeAll(true);
    g.fillStyle(0x0b141d);
    g.fillRoundedRect(OX - 13, OY - 13, C * 6 + 26, C * 6 + 26, 18);
    g.fillStyle(0x2a3b47);
    g.fillRoundedRect(OX, OY, C * 6, C * 6, 9);
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 6; x++) {
        g.fillStyle((x + y) % 2 ? 0x293945 : 0x2d3e4a);
        g.fillRoundedRect(OX + x * C + 2, OY + y * C + 2, C - 4, C - 4, 5);
      }
    g.fillStyle(0x101b26);
    g.fillRect(OX + 6 * C, OY + 2 * C + 5, 60, C - 10);
    g.lineStyle(2, 0xf4bd62);
    for (let x = 0; x < 3; x++) {
      let xx = OX + 6 * C + 10 + x * 12;
      g.beginPath();
      g.moveTo(xx, OY + 2.5 * C - 8);
      g.lineTo(xx + 7, OY + 2.5 * C);
      g.lineTo(xx, OY + 2.5 * C + 8);
      g.strokePath();
    }
    this.cars.forEach((c, i) => {
      let pos = c.p + (this.drag && this.drag.i === i ? this.drag.offset : 0);
      if (this.won && i === 0) pos = 6;
      let x = OX + (c.h ? pos : c.f) * C + 6,
        y = OY + (c.h ? c.f : pos) * C + 6,
        w = (c.h ? c.l : 1) * C - 12,
        h = (c.h ? 1 : c.l) * C - 12;
      let sprite = this.add.image(
        x + w / 2,
        y + h / 2,
        "realistic-vehicles",
        c.texture,
      );
      sprite.setDisplaySize(c.l * C - 10, C - 10);
      if (!c.h) sprite.setRotation(Math.PI / 2);
      this.vehicles.add(sprite);
      if (i === this.selected) {
        g.lineStyle(3, 0xffe3a0);
        g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 12);
      }
    });
  }
  bindControls() {
    $("levels").replaceChildren();
    this.levels.forEach((level, i) => {
      const b = document.createElement("button");
      b.textContent = String((i % LEVELS_PER_TIER) + 1).padStart(2, "0");
      b.setAttribute(
        "aria-label",
        names[Math.floor(i / LEVELS_PER_TIER)] +
          " challenge " +
          ((i % LEVELS_PER_TIER) + 1),
      );
      b.onclick = () => this.loadLevel(i);
      $("levels").append(b);
    });
    $("undo").onclick = () => this.undo();
    $("reset").onclick = () => this.restartLevel();
    $("next").onclick = () =>
      this.loadLevel((this.current + 1) % this.levels.length);
    $("tier").onchange = () =>
      this.loadLevel(names.indexOf($("tier").value) * LEVELS_PER_TIER);
    $("hint").onclick = () => {
      if (this.won) return;
      $("message").textContent = "Finding a shortest route…";
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => {
        this.hintTimer = null;
        let path = this.solve();
        if (path && path.length) {
          let [i, p] = path[0];
          this.selected = i;
          let c = this.cars[i],
            delta = p - c.p;
          $("message").textContent =
            (i === 0 ? "Red car" : "Highlighted car") +
            ": move " +
            Math.abs(delta) +
            " space" +
            (Math.abs(delta) > 1 ? "s" : "") +
            " " +
            (c.h ? (delta > 0 ? "right" : "left") : delta > 0 ? "down" : "up") +
            ".";
          this.draw();
        } else
          $("message").textContent = path
            ? "Slide the red car right through the exit."
            : "Try undoing a move or restarting.";
      }, 30);
    };
  }
  showFireworks() {
    const overlay = document.createElement("div");
    overlay.className = "fireworks";
    overlay.setAttribute("aria-hidden", "true");
    const particleCount = 48;
    // Right edge of the board, centered on the red car's exit lane.
    // Percentages keep the origin aligned with the scaled 560 × 490 canvas.
    const exitX = ((38 + 6 * 76) / 560) * 100;
    const exitY = ((22 + 2.5 * 76) / 490) * 100;
    for (let burst = 0; burst < 3; burst++) {
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("span");
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 225;
        particle.style.left = `${exitX}%`;
        particle.style.top = `${exitY}%`;
        particle.style.setProperty(
          "--spark-color",
          `hsl(${Math.random() * 360} 100% 65%)`,
        );
        particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty(
          "--dy",
          `${Math.sin(angle) * distance + 45}px`,
        );
        particle.style.setProperty("--angle", `${angle}rad`);
        particle.style.animationDelay = `${burst * 180 + Math.random() * 140}ms`;
        particle.style.animationDuration = `${900 + Math.random() * 650}ms`;
        overlay.append(particle);
      }
    }
    document.getElementById("game").append(overlay);
    return () => overlay.remove();
  }
  // Register tightly cropped frames from the 3-column, 5-row vehicle spritesheet.
  createVehicleFrames() {
    if (!this.textures.exists("realistic-vehicles")) {
      document.getElementById("message").textContent =
        "Could not load the vehicle spritesheet. Please refresh.";
      throw new Error("Vehicle spritesheet failed to load");
    }
    const texture = this.textures.get("realistic-vehicles");
    const sheet = texture.getSourceImage();
    const canvas = document.createElement("canvas");
    canvas.width = sheet.width;
    canvas.height = sheet.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(sheet, 0, 0);
    const pixels = context.getImageData(0, 0, sheet.width, sheet.height).data;
    const frames = [
      "red-car",
      ...Array.from({ length: 10 }, (_, i) => `car-${i}`),
      ...Array.from({ length: 4 }, (_, i) => `truck-${i}`),
    ];
    frames.forEach((name, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = Math.round((column * sheet.width) / 3);
      const y = Math.round((row * sheet.height) / 5);
      const endX = Math.round(((column + 1) * sheet.width) / 3);
      const endY = Math.round(((row + 1) * sheet.height) / 5);
      let left = endX,
        top = endY,
        right = -1,
        bottom = -1;
      for (let py = y; py < endY; py++) {
        for (let px = x; px < endX; px++) {
          if (pixels[(py * sheet.width + px) * 4 + 3] > 16) {
            left = Math.min(left, px);
            right = Math.max(right, px);
            top = Math.min(top, py);
            bottom = Math.max(bottom, py);
          }
        }
      }
      if (right < left) throw new Error(`Empty vehicle sprite: ${name}`);
      if (!texture.has(name)) {
        texture.add(name, 0, left, top, right - left + 1, bottom - top + 1);
      }
    });
  }
}
