const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const levels = JSON.parse(
  fs.readFileSync(path.join(root, "levels.json"), "utf8"),
);
assert.equal(levels.length, 40);
const unique = new Set();
for (const [index, level] of levels.entries()) {
  const occupied = new Set();
  assert.deepEqual(
    level.cars[0].filter((_, i) => i !== 2),
    [1, 2, 2],
  );
  for (const car of level.cars) {
    assert.equal(car.length, 4);
    assert.ok(car.every(Number.isInteger));
    const [horizontal, lane, position, length] = car;
    assert.ok(horizontal === 0 || horizontal === 1);
    assert.ok(length === 2 || length === 3);
    assert.ok(lane >= 0 && lane < 6 && position >= 0 && position + length <= 6);
    for (let offset = 0; offset < length; offset++) {
      const cell = horizontal
        ? lane * 6 + position + offset
        : (position + offset) * 6 + lane;
      assert.ok(!occupied.has(cell), `Overlap in level ${index + 1}`);
      occupied.add(cell);
    }
  }
  const key = JSON.stringify([level.cars[0], ...level.cars.slice(1).sort()]);
  assert.ok(!unique.has(key), `Duplicate level ${index + 1}`);
  unique.add(key);
  if (index)
    assert.ok(
      level.par >= levels[index - 1].par,
      "Difficulty must not decrease",
    );
  if (index % 10 === 0 && index) assert.ok(level.par > levels[index - 1].par);
}

// Exercise the actual game solver, moves, and navigation with a minimal DOM.
function element() {
  const classes = new Set();
  return {
    children: [],
    classList: {
      toggle(name, on) {
        if (on) classes.add(name);
        else classes.delete(name);
      },
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    append(child) {
      this.children.push(child);
    },
  };
}
const elements = new Map();
const get = (id) => {
  if (!elements.has(id)) elements.set(id, element());
  return elements.get(id);
};
const storage = new Map([["gridlock-bests", '{"0":99}']]);
let initialized = false;
const timers = new Map();
let timerId = 0;
let celebrations = 0;
const context = vm.createContext({
  showFireworks() { celebrations++; return () => celebrations--; },
  clearTimeout(id) { timers.delete(id); },
  fitGameViewport() {},
  document: {
    getElementById: get,
    createElement: element,
    querySelectorAll: () => get("levels").children,
  },
  localStorage: {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  },
  Phaser: {
    Scene: class {},
    Game: class {
      constructor() {
        initialized = true;
      }
    },
    Scale: {},
    Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) },
  },
  fetch: async () => ({ json: async () => levels }),
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
});
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(source, context);
setImmediate(() => {
  assert.ok(initialized, "Game should finish loading its deck");
  vm.runInContext("scene = { draw() {} };", context);
  const names = ["Beginner", "Intermediate", "Advanced", "Expert"];
  for (let index = 0; index < levels.length; index++) {
    vm.runInContext(`load(${index});`, context);
    const visible = get("levels").children.filter((button) => !button.hidden);
    assert.equal(visible.length, 10);
    assert.deepEqual(
      visible.map((button) => button.textContent),
      Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    assert.equal(get("tier").value, names[Math.floor(index / 10)]);
    assert.equal(vm.runInContext("bests[current]", context), undefined);
    const solution = vm.runInContext("solve()", context);
    assert.ok(
      solution,
      `Level ${index + 1} must be solvable within the hint limit`,
    );
    assert.equal(
      solution.length + 1,
      levels[index].par,
      `Incorrect par for level ${index + 1}`,
    );
    for (const [car, position] of solution)
      vm.runInContext(`move(${car}, ${position});`, context);
    vm.runInContext("move(0, 6)", context);
    assert.ok(vm.runInContext("won", context));
    assert.equal(vm.runInContext("moves", context), levels[index].par);
    assert.equal(celebrations, 1);
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 3000);
    get("next").onclick();
    assert.equal(timers.size, 0);
    assert.equal(celebrations, 0);
    assert.equal(vm.runInContext("current", context), (index + 1) % 40);
  }
  for (const [tier, name] of names.entries()) {
    get("tier").value = name;
    get("tier").onchange();
    assert.equal(vm.runInContext("current", context), tier * 10);
  }
  assert.equal(storage.get("gridlock-bests"), '{"0":99}');
  assert.equal(
    Object.keys(JSON.parse(storage.get("gridlock-bests-v2"))).length,
    40,
  );
  console.log(
    "Validated 40 unique legal boards, optimal solutions, tier navigation, next/wrap, and saved-score isolation.",
  );
  const handlers = {};
  context.createToyTextures = () => {};
  context.dragTestScene = {
    add: { graphics: () => ({}), container: () => ({}) },
    input: { on: (event, callback) => { handlers[event] = callback; }, keyboard: { on() {} } },
    draw() {},
  };
  storage.delete("gridlock-progress-v2");
  vm.runInContext("Play.prototype.create.call(dragTestScene); cars = [{h:1,f:2,p:0,l:2},{h:0,f:4,p:0,l:3}];", context);
  const pointer = (x, y) => ({ x: 38 + x * 76, y: 22 + y * 76 });
  handlers.pointerdown(pointer(0.5, 2.5));
  handlers.pointermove(pointer(0.9, 2.5));
  assert.equal(vm.runInContext("drag.offset", context), 0);
  handlers.pointermove(pointer(1.1, 2.5));
  assert.equal(vm.runInContext("drag.offset", context), 1);
  handlers.pointermove(pointer(5.5, 2.5));
  assert.equal(vm.runInContext("drag.offset", context), 2, "Snap must stop at the blocker");
  handlers.pointerupoutside();
  assert.equal(vm.runInContext("cars[0].p", context), 2);
  assert.equal(vm.runInContext("moves", context), 1);
  assert.equal(vm.runInContext("drag", context), null);
  handlers.pointerup();
  assert.equal(vm.runInContext("moves", context), 1, "Release must only count once");
  vm.runInContext("undo()", context);
  assert.equal(vm.runInContext("cars[0].p", context), 0);
  handlers.pointerdown(pointer(4.5, 0.5));
  handlers.pointermove(pointer(4.5, 2.1));
  assert.equal(vm.runInContext("drag.offset", context), 2);
  handlers.pointerup();
  assert.equal(vm.runInContext("cars[1].p", context), 2);
  vm.runInContext("move(1, 2.7)", context);
  assert.equal(vm.runInContext("cars[1].p", context), 3);
  vm.runInContext("move(0, 6)", context);
  assert.equal(timers.size, 1);
  vm.runInContext("undo()", context);
  assert.equal(timers.size, 0);
  assert.equal(celebrations, 0);
  vm.runInContext("move(0, 6)", context);
  [...timers.values()][0].callback();
  assert.equal(vm.runInContext("current", context), 1);
  assert.equal(timers.size, 0);
  assert.equal(celebrations, 0);
  // Restart cancels pending work and restores the same level, including mid-drag.
  vm.runInContext("load(0); move(...solve()[0]); drag = {i: 0, start: cars[0].p, offset: 1};", context);
  get("hint").onclick();
  assert.equal(timers.size, 1);
  get("reset").onclick();
  assert.equal(vm.runInContext("current", context), 0);
  assert.equal(vm.runInContext("moves", context), 0);
  assert.equal(vm.runInContext("history.length", context), 0);
  assert.equal(vm.runInContext("drag", context), null);
  assert.equal(vm.runInContext("selected", context), -1);
  assert.equal(vm.runInContext("won", context), false);
  assert.equal(JSON.stringify(vm.runInContext("positions()", context)), JSON.stringify(levels[0].cars.map(c => c[2])));
  assert.equal(timers.size, 0);
  vm.runInContext("for (const [i, p] of solve()) move(i, p); move(0, 6);", context);
  assert.equal(celebrations, 1);
  get("reset").onclick();
  assert.equal(vm.runInContext("current", context), 0);
  assert.equal(vm.runInContext("won", context), false);
  assert.equal(vm.runInContext("moves", context), 0);
  assert.equal(timers.size, 0);
  assert.equal(celebrations, 0);
  console.log("Validated Restart during play, dragging, pending hints, and the win countdown.");
  vm.runInContext("load(12); move(...solve()[0]);", context);
  const progress = storage.get("gridlock-progress-v2");
  const expected = JSON.parse(progress);
  vm.runInContext("cars = []; history = []; moves = 0; current = 0; resumeProgress();", context);
  assert.equal(vm.runInContext("current", context), 12);
  assert.equal(vm.runInContext("moves", context), 1);
  assert.equal(JSON.stringify(vm.runInContext("positions()", context)), JSON.stringify(expected.positions));
  vm.runInContext("undo()", context);
  assert.equal(JSON.parse(storage.get("gridlock-progress-v2")).moves, 0);
  vm.runInContext("resumeProgress()", context);
  assert.equal(vm.runInContext("moves", context), 0);
  vm.runInContext("for (const [i,p] of solve()) move(i,p); move(0,6); resumeProgress();", context);
  assert.equal(vm.runInContext("current", context), 13);
  assert.equal(timers.size, 0);
  storage.set("gridlock-progress-v2", "invalid JSON");
  vm.runInContext("resumeProgress()", context);
  assert.equal(vm.runInContext("current", context), 0);
  const invalid = JSON.parse(progress);
  invalid.positions[0] = 99;
  storage.set("gridlock-progress-v2", JSON.stringify(invalid));
  vm.runInContext("resumeProgress()", context);
  assert.equal(vm.runInContext("moves", context), 0);
  assert.equal(JSON.stringify(vm.runInContext("positions()", context)), JSON.stringify(levels[12].cars.map(c => c[2])));
  console.log("Validated saved level/board restoration, undo persistence, completed-level advancement, and invalid-save recovery.");
  console.log("Validated horizontal/vertical grid snapping, collision limits, outside release, move counts, and undo.");
});
