(() => {
  const wrap = document.querySelector(".gallery-wrap");
  if (!wrap) return;

  const marquee = wrap.querySelector(".gallery.marquee");
  const track = wrap.querySelector(".marquee-track");
  const leftBtn = wrap.querySelector(".gallery-arrow.left");
  const rightBtn = wrap.querySelector(".gallery-arrow.right");

  if (!marquee || !track) return;

  // ===== Helpers: read/write translateX =====
  function getTranslateX(el) {
    const style = getComputedStyle(el);
    const transform = style.transform;
    if (!transform || transform === "none") return 0;

    const match = transform.match(/matrix(3d)?\((.+)\)/);
    if (!match) return 0;

    const parts = match[2].split(",").map(v => parseFloat(v.trim()));
    return match[1] === "3d" ? parts[12] : parts[4];
  }

  function setTranslateX(el, x) {
    el.style.transform = `translate3d(${x}px,0,0)`;
  }

  // ===== Settings =====
  const RESUME_DELAY = 900;

  let resumeTimer = null;
  let rafId = null;
  let lastTs = null;
  let paused = false;

  // ===== Read CSS vars =====
  function getGapPx() {
    const gapStr = getComputedStyle(marquee).getPropertyValue("--gap").trim();
    return gapStr ? parseFloat(gapStr) : 18;
  }

  // Your track contains A + B duplicates.
  // Loop distance should be one set width (half of scrollWidth) + half the gap.
  function getLoopDistancePx() {
    const gap = getGapPx();
    return track.scrollWidth / 2 + gap / 2;
  }

  function getSpeedSeconds() {
    const speedStr = getComputedStyle(marquee).getPropertyValue("--speed").trim();
    const n = parseFloat(speedStr);
    return Number.isFinite(n) ? n : 45;
  }

  function getPxPerSecond() {
    const dist = getLoopDistancePx();
    const secs = getSpeedSeconds();
    return dist / secs;
  }

  // ===== rAF auto-scroll =====
  function stopRaf() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = null;
  }

  function startRaf() {
    stopRaf();

    const pxPerSec = getPxPerSecond();

    const tick = (ts) => {
      if (paused) return;

      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      let x = getTranslateX(track);
      x -= pxPerSec * dt; // move left

      const loopDist = getLoopDistancePx();
      if (x <= -loopDist) x += loopDist;

      setTranslateX(track, x);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function freeze() {
    const x = getTranslateX(track);

    // Ensure CSS animation isn't fighting our transform
    track.style.animation = "none";
    track.style.animationPlayState = "paused";

    stopRaf();
    setTranslateX(track, x);

    // force apply
    track.offsetHeight;
  }

  function pauseAuto() {
    paused = true;
    freeze();
    if (resumeTimer) clearTimeout(resumeTimer);
  }

  function resumeAuto() {
    paused = false;
    startRaf();
  }

  function resumeAutoSoon(delay = RESUME_DELAY) {
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => resumeAuto(), delay);
  }

  // ===== Centering logic for arrows =====
  function getTiles() {
    return Array.from(track.querySelectorAll("a.tile"));
  }

  function getGalleryCenterX() {
    const rect = marquee.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function getCenteredTileIndex() {
    const tiles = getTiles();
    if (!tiles.length) return 0;

    const galleryCenter = getGalleryCenterX();
    let bestIdx = 0;
    let bestDist = Infinity;

    tiles.forEach((tile, i) => {
      const r = tile.getBoundingClientRect();
      const tileCenter = r.left + r.width / 2;
      const d = Math.abs(tileCenter - galleryCenter);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });

    return bestIdx;
  }

  function centerTile(tile) {
    const galleryRect = marquee.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();

    const galleryCenter = galleryRect.left + galleryRect.width / 2;
    const tileCenter = tileRect.left + tileRect.width / 2;

    const delta = tileCenter - galleryCenter;
    const currentX = getTranslateX(track);
    const targetX = currentX - delta;

    track.style.transition = "transform 400ms ease";
    setTranslateX(track, targetX);

    window.setTimeout(() => {
      track.style.transition = "";
    }, 420);
  }

  function step(dir) {
    pauseAuto();

    const tiles = getTiles();
    if (!tiles.length) return;

    const current = getCenteredTileIndex();
    let next = current + dir;

    // wrap around
    if (next < 0) next = tiles.length - 1;
    if (next >= tiles.length) next = 0;

    centerTile(tiles[next]);

    // resume from same position after a short delay
    resumeAutoSoon(RESUME_DELAY);
  }

  // ===== Arrow events =====
  leftBtn?.addEventListener("click", () => step(-1));
  rightBtn?.addEventListener("click", () => step(1));

  // ===== Hover pause/resume =====
  wrap.addEventListener("mouseenter", () => pauseAuto());
  wrap.addEventListener("mouseleave", () => resumeAuto());

  // Prevent image dragging from interfering
  marquee.addEventListener("dragstart", (e) => e.preventDefault());

  // ===== Click behavior =====
  // Don’t block navigation. Just pause for a clean feel.
  track.addEventListener("click", (e) => {
    const link = e.target.closest("a.tile");
    if (link) pauseAuto();
  });

  // ===== Start =====
  freeze();
  paused = false;
  startRaf();
})

();
