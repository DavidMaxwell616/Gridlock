/* Original procedural top-down toy vehicles, based on the user's reference photo. */
const CAR_PALETTE = [
  "#e78740",
  "#674c51",
  "#b5b09a",
  "#b9ce53",
  "#139ed5",
  "#5146a0",
  "#202c32",
  "#596639",
  "#6bc4a6",
  "#008e88",
];
const TRUCK_PALETTE = ["#efbc21", "#126bd5", "#08adbd", "#a68cce"];
function toyTexture(scene, key, color, truck) {
  const canvas = document.createElement("canvas");
  canvas.width = truck ? 440 : 288;
  canvas.height = 140;
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  const rr = (x, y, a, b, r, fill, stroke) => {
    ctx.beginPath();
    ctx.roundRect(x, y, a, b, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const grad = (x, y, a, b, stops) => {
    let g = ctx.createLinearGradient(x, y, a, b);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    return g;
  };
  ctx.shadowColor = "#0009";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 6;
  rr(9, 9, w - 18, h - 20, 18, color);
  ctx.shadowColor = "transparent";
  // Molded base, side rails and polished plastic body.
  rr(
    10,
    10,
    w - 20,
    h - 22,
    16,
    grad(0, 8, 0, 132, [
      [0, "#ffffff99"],
      [0.08, color],
      [0.65, color],
      [1, "#00000066"],
    ]),
    "#ffffff55",
  );
  rr(16, 19, w - 33, h - 41, 13, color, "#ffffff66");
  for (const yy of [11, 121]) rr(36, yy, w - 76, 5, 2, "#ffffff65");
  rr(20, 30, 9, 77, 4, "#ffffff55");
  rr(w - 29, 31, 9, 76, 4, "#ffffff44");
  if (truck) {
    // Long load bed, five raised ribs and separate cab.
    rr(
      58,
      19,
      w - 186,
      102,
      7,
      grad(0, 20, 0, 120, [
        [0, "#ffffff88"],
        [0.14, color],
        [0.8, color],
        [1, "#00000044"],
      ]),
      "#ffffff77",
    );
    for (let i = 0; i < 5; i++) {
      let x = 62 + (i * (w - 198)) / 5;
      rr(x, 24, (w - 207) / 5, 91, 3, color, "#00000033");
      rr(x + 2, 26, 4, 84, 2, "#ffffff55");
    }
    rr(
      w - 117,
      23,
      76,
      94,
      17,
      grad(w - 115, 0, w - 39, 0, [
        [0, "#00000044"],
        [0.22, color],
        [0.8, color],
        [1, "#ffffff66"],
      ]),
      "#ffffff55",
    );
    // Molded windshield, bonnet vents, and load-bed end panel.
    rr(w - 125, 34, 13, 72, 5, "#122c4266", "#ffffff55");
    for (let y = 40; y < 106; y += 20)
      rr(w - 75, y, 23, 7, 4, "#ffffff55", "#00000033");
    rr(24, 31, 31, 78, 5, "#00000022", "#ffffff55");
  } else {
    // Long sculpted hood, raised roof and curved windows in tinted plastic.
    rr(
      37,
      27,
      97,
      86,
      22,
      grad(35, 20, 135, 115, [
        [0, "#ffffff77"],
        [0.3, color],
        [1, color],
      ]),
      "#ffffff33",
    );
    ctx.beginPath();
    ctx.moveTo(142, 28);
    ctx.quadraticCurveTo(127, 69, 142, 112);
    ctx.lineTo(158, 108);
    ctx.quadraticCurveTo(146, 70, 158, 32);
    ctx.closePath();
    ctx.fillStyle = "#0c26394d";
    ctx.fill();
    ctx.strokeStyle = "#ffffff55";
    ctx.stroke();
    rr(
      158,
      31,
      52,
      77,
      13,
      grad(156, 30, 208, 108, [
        [0, "#ffffffbb"],
        [0.12, color],
        [0.8, color],
        [1, "#00000044"],
      ]),
      "#ffffff55",
    );
    rr(213, 35, 12, 68, 5, "#15283755", "#ffffff44");
    rr(231, 33, 25, 75, 12, color, "#ffffff44");
    rr(32, 27, 82, 4, 2, "#ffffff77");
    rr(35, 109, 87, 4, 2, "#00000044");
  }
  // Headlights, tail lights, tiny bumper details, specular reflections.
  for (const y of [25, 103]) {
    rr(w - 23, y, 5, 12, 2, "#fff4bd");
    rr(17, y, 4, 12, 2, "#963b3a88");
  }
  rr(38, 19, truck ? 184 : 72, 4, 2, "#ffffffaa");
  rr(w - 106, 27, 30, 5, 3, "#ffffff99");
  scene.textures.addCanvas(key, canvas);
}
function createToyTextures(scene) {
  if (scene.textures.exists("realistic-vehicles")) {
    const sheet = scene.textures.get("realistic-vehicles").getSourceImage();
    const keys = ["toy-red", ...CAR_PALETTE.map((_, i) => "toy-car-" + i), ...TRUCK_PALETTE.map((_, i) => "toy-truck-" + i)];
    keys.forEach((key, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = Math.round(column * sheet.width / 3);
      const y = Math.round(row * sheet.height / 5);
      const width = Math.round((column + 1) * sheet.width / 3) - x;
      const height = Math.round((row + 1) * sheet.height / 5) - y;
      const cell = document.createElement("canvas");
      cell.width = width;
      cell.height = height;
      const ctx = cell.getContext("2d");
      ctx.drawImage(sheet, x, y, width, height, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      let left = width, top = height, right = -1, bottom = -1;
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          if (pixels[(py * width + px) * 4 + 3] > 16) {
            left = Math.min(left, px);
            right = Math.max(right, px);
            top = Math.min(top, py);
            bottom = Math.max(bottom, py);
          }
        }
      }
      if (right < left) return;
      const sprite = document.createElement("canvas");
      sprite.width = right - left + 1;
      sprite.height = bottom - top + 1;
      sprite.getContext("2d").drawImage(cell, left, top, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
      scene.textures.addCanvas(key, sprite);
    });
    return;
  }
  toyTexture(scene, "toy-red", "#a92343", false);
  CAR_PALETTE.forEach((c, i) => toyTexture(scene, "toy-car-" + i, c, false));
  TRUCK_PALETTE.forEach((c, i) => toyTexture(scene, "toy-truck-" + i, c, true));
}
