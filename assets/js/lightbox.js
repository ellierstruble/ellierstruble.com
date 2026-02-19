(() => {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  const stage = lb.querySelector(".lightbox-stage");
  const lbImg = lb.querySelector(".lightbox-img");
  const lbCap = lb.querySelector(".lightbox-caption");
  const btnClose = lb.querySelector(".lightbox-close");
  const btnPrev = lb.querySelector(".lightbox-prev");
  const btnNext = lb.querySelector(".lightbox-next");

  let group = [];
  let index = 0;

  // ---- Zoom + Pan state
  let scale = 1;
  let tx = 0, ty = 0;
  let isDragging = false;
  let startX = 0, startY = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 3;     // “certain point” (max zoom)
  const ZOOM_STEP = 0.12;  // scroll sensitivity

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function getPanBounds() {
    // simple “don’t fly away” bounds; tweak if needed
    const bound = 600 * (scale - 1);
    return { x: bound, y: bound };
  }

  function applyTransform(smooth = true) {
    lbImg.style.transition = smooth ? "transform 0.12s ease" : "none";
    lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform(true);
  }
  // ---- end zoom/pan

  function openLightbox(links, startIndex) {
    group = links;
    index = startIndex;
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    render();
  }

  function closeLightbox() {
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetView();
  }

  function render() {
    const a = group[index];
    const src = a.getAttribute("href");
    const img = a.querySelector("img");
    const alt = img?.getAttribute("alt") || "";
    lbImg.src = src;
    lbImg.alt = alt;
    if (lbCap) lbCap.textContent = alt;

    resetView(); // reset zoom/pan when switching images
  }

  function prev() {
    index = (index - 1 + group.length) % group.length;
    render();
  }

  function next() {
    index = (index + 1) % group.length;
    render();
  }

  // Click tile -> open
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[data-lightbox]');
    if (!a) return;

    e.preventDefault();

    const name = a.dataset.lightbox;
    const links = Array.from(document.querySelectorAll(`a[data-lightbox="${name}"]`));
    const startIndex = links.indexOf(a);
    openLightbox(links, Math.max(0, startIndex));
  });

  // Controls
  btnClose?.addEventListener("click", closeLightbox);
  btnPrev?.addEventListener("click", prev);
  btnNext?.addEventListener("click", next);

  // Click outside image closes
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  // ---- Wheel zoom + drag pan
  if (stage) {
    stage.addEventListener(
      "wheel",
      (e) => {
        if (!lb.classList.contains("is-open")) return;
        e.preventDefault();

        const prevScale = scale;
        scale += e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        scale = clamp(scale, MIN_SCALE, MAX_SCALE);

        // If we zoom all the way out, recenter
        if (scale === MIN_SCALE) {
          tx = 0;
          ty = 0;
        } else if (scale !== prevScale) {
          const b = getPanBounds();
          tx = clamp(tx, -b.x, b.x);
          ty = clamp(ty, -b.y, b.y);
        }

        applyTransform(true);
      },
      { passive: false }
    );

    stage.addEventListener("mousedown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (scale <= 1) return; // only drag when zoomed

      isDragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      stage.classList.add("is-dragging");
      applyTransform(false);
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      tx = e.clientX - startX;
      ty = e.clientY - startY;

      const b = getPanBounds();
      tx = clamp(tx, -b.x, b.x);
      ty = clamp(ty, -b.y, b.y);

      applyTransform(false);
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      stage.classList.remove("is-dragging");
      applyTransform(true);
    });
  }
  // ---- end wheel/drag
})();