(() => {
  const gallery = document.querySelector('.gallery.marquee');
  if (!gallery) return;

  const track = gallery.querySelector('.marquee-track');
  if (!track) return;

  // --- helpers ---
  const getHalfWidth = () => track.scrollWidth / 2;

  const getPointerX = (e) =>
    (e.touches && e.touches.length) ? e.touches[0].clientX : e.clientX;

  const readTranslateX = () => {
    const t = getComputedStyle(track).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\((.+)\)/);
    if (!m) return 0;
    const values = m[1].split(',').map(v => parseFloat(v.trim()));
    return values[4] || 0;
  };

  const wrapTranslate = (x) => {
    const half = getHalfWidth();
    while (x <= -half) x += half;
    while (x > 0) x -= half;
    return x;
  };

  const setTranslate = (x) => {
    currentX = wrapTranslate(x);
    track.style.transform = `translateX(${currentX}px)`;
  };

  const stopCssAnimationAndFreeze = () => {
    // Freeze animated position into inline transform
    const frozen = readTranslateX();
    track.style.animation = 'none';
    track.style.animationDelay = '';
    setTranslate(frozen);
    // force reflow so the browser commits the "animation: none"
    track.offsetHeight;
  };

  const resumeCssAnimationFromCurrent = () => {
    // Compute how far we are through one half and apply negative delay
    const half = getHalfWidth();
    const progress = Math.abs(currentX) / half; // 0..1

    // Read --speed from gallery (e.g. "10s")
    const speedStr = getComputedStyle(gallery).getPropertyValue('--speed').trim();
    const speedSec = parseFloat(speedStr) || 10;

    // Remove inline transform so CSS animation takes over
    track.style.transform = '';
    track.style.animation = '';
    track.style.animationDelay = `-${progress * speedSec}s`;
  };

  // --- state ---
  let isDown = false;
  let startX = 0;

  let currentX = 0;      // current translateX (px, wrapped)
  let lastX = 0;         // last pointer position
  let lastTime = 0;      // timestamp
  let velocity = 0;      // px per ms

  let rafId = null;
  let inertiaId = null;

  // Tuning knobs for “smoothness”
  const VELOCITY_SMOOTHING = 0.18; // 0..1 (higher = more responsive, lower = smoother)
  const FRICTION = 0.95;           // 0..1 (closer to 1 = longer glide)
  const STOP_VELOCITY = 0.02;      // px/ms threshold to stop inertia
  const INERTIA_FRAME_MS = 16;     // ~60fps

  const cancelInertia = () => {
    if (inertiaId) {
      clearInterval(inertiaId);
      inertiaId = null;
    }
  };

  const startDrag = (e) => {
    isDown = true;
    gallery.classList.add('is-dragging');

    cancelInertia();

    stopCssAnimationAndFreeze();

    startX = getPointerX(e);
    lastX = startX;
    lastTime = performance.now();
    velocity = 0;

    // prevent image ghost drag and page scroll while dragging horizontally
    e.preventDefault?.();
  };

  const dragMove = (e) => {
    if (!isDown) return;

    const x = getPointerX(e);
    const now = performance.now();

    const dx = x - lastX;
    const dt = Math.max(1, now - lastTime);

    // Instant velocity (px/ms)
    const v = dx / dt;

    // Smooth velocity to reduce jitter (trackpad/touch noise)
    velocity = velocity * (1 - VELOCITY_SMOOTHING) + v * VELOCITY_SMOOTHING;

    // Apply movement
    setTranslate(currentX + dx);

    lastX = x;
    lastTime = now;

    e.preventDefault?.();
  };

  const endDrag = () => {
    if (!isDown) return;
    isDown = false;
    gallery.classList.remove('is-dragging');

    // Inertia glide
    cancelInertia();
    inertiaId = setInterval(() => {
      // Apply velocity to position (convert px/ms -> px/frame)
      setTranslate(currentX + velocity * INERTIA_FRAME_MS);

      // Decay velocity
      velocity *= FRICTION;

      // Stop when slow
      if (Math.abs(velocity) < STOP_VELOCITY) {
        cancelInertia();
        // Resume CSS marquee exactly where we landed
        resumeCssAnimationFromCurrent();
      }
    }, INERTIA_FRAME_MS);
  };

  // Mouse
  gallery.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', endDrag);

  // Touch
  gallery.addEventListener('touchstart', startDrag, { passive: false });
  gallery.addEventListener('touchmove', dragMove, { passive: false });
  gallery.addEventListener('touchend', endDrag);

  // Prevent native dragging of images
  track.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

  // Keep wrapping accurate on resize
  window.addEventListener('resize', () => {
    setTranslate(currentX);
  });
})();