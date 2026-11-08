const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let top = 260;
const controls = { height: 44, marginTop: "0", marginBottom: "0" };
const message = { height: 42, marginTop: "15", marginBottom: "15" };
for (const element of [controls, message]) element.getBoundingClientRect = () => ({ height: element.height });
const section = { clientWidth: 724, querySelector: () => controls };
const board = { parentElement: section, style: {}, getBoundingClientRect: () => ({ top: top - window.scrollY }) };
const events = {};
const window = { innerHeight: 600, scrollY: 0, addEventListener: (name, callback) => { events[name] = callback; } };
const frames = [];
let refreshes = 0;
const context = vm.createContext({
  window,
  document: { getElementById: id => id === "game" ? board : message, querySelector: () => ({}) },
  getComputedStyle: element => element,
  ResizeObserver: class { observe() {} },
  requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
  game: { scale: { refresh: () => refreshes++ } },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../viewport.js"), "utf8"), context);
vm.runInContext("fitGameViewport(game)", context);
const flush = () => { while (frames.length) frames.shift()(); };
flush();
for (const [height, width] of [[600, 724], [650, 594], [768, 724], [900, 724], [600, 296]]) {
  window.innerHeight = height;
  section.clientWidth = width;
  events.resize();
  flush();
  const boardWidth = parseFloat(board.style.width);
  const boardHeight = parseFloat(board.style.height);
  assert.ok(boardWidth <= width);
  assert.ok(Math.abs(boardWidth / boardHeight - 560 / 490) < 1e-10);
  assert.ok(top + boardHeight + 44 + 72 + 16 <= height + 0.001, "Board and controls must fit");
}
const beforeScroll = board.style.height;
window.scrollY = 120;
events.resize();
flush();
assert.equal(board.style.height, beforeScroll);
window.innerHeight = 300;
events.resize();
flush();
assert.equal(parseFloat(board.style.height), 160, "Very short screens retain a usable board with scrolling");
assert.ok(refreshes > 1);
console.log("Viewport sizing passed: laptop heights, narrow windows, aspect ratio, resize, scroll stability, and short-screen fallback.");
