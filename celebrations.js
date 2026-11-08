function showFireworks() {
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
      particle.style.setProperty("--spark-color", `hsl(${Math.random() * 360} 100% 65%)`);
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance + 45}px`);
      particle.style.setProperty("--angle", `${angle}rad`);
      particle.style.animationDelay = `${burst * 180 + Math.random() * 140}ms`;
      particle.style.animationDuration = `${900 + Math.random() * 650}ms`;
      overlay.append(particle);
    }
  }
  document.getElementById("game").append(overlay);
  return () => overlay.remove();
}
