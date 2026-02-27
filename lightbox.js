(() => {
  const lb = document.getElementById("lightbox");
  if (!lb) return;

  const stage = lb.querySelector(".lightbox-stage");
  const lbImg = lb.querySelector(".lightbox-img");
  const lbVideo = lb.querySelector(".lightbox-video");
  const lbCap = lb.querySelector(".lightbox-caption");
  const btnClose = lb.querySelector(".lightbox-close");
  const btnPrev = lb.querySelector(".lightbox-prev");
  const btnNext = lb.querySelector(".lightbox-next");

  let group = [];
  let index = 0;

  // ---- Zoom + Pan state (images only)
  let scale = 1;
  let tx = 0, ty = 0;
  let isDragging = false;
  let startX = 0, startY = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.12;

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function getPanBounds() {
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

    // Stop video if playing
    if (lbVideo) {
      lbVideo.pause();
      lbVideo.src = "";
    }

    resetView();
  }

function render() {
  const a = group[index];
  const src = a.getAttribute("href");

  const imgThumb = a.querySelector("img");
  const videoThumb = a.querySelector("video");

  const caption =
    a.dataset.caption ||
    imgThumb?.getAttribute("alt") ||
    videoThumb?.getAttribute("aria-label") ||
    "";

  const isVideo = src.toLowerCase().endsWith(".mp4");

  if (isVideo) {
    // Show video
    lbImg.style.display = "none";
    lbVideo.style.display = "block";

    lbVideo.src = src;
    lbVideo.play();
  } else {
    // Show image
    lbVideo.pause();
    lbVideo.src = "";
    lbVideo.style.display = "none";

    lbImg.style.display = "block";
    lbImg.src = src;
    lbImg.alt = caption; // <-- use caption here

    resetView();
  }

  if (lbCap) lbCap.textContent = caption;
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
    const links = Array.from(
      document.querySelectorAll(`a[data-lightbox="${name}"]`)
    );

    const startIndex = links.indexOf(a);
    openLightbox(links, Math.max(0, startIndex));
  });

  // Controls
  btnClose?.addEventListener("click", closeLightbox);
  btnPrev?.addEventListener("click", prev);
  btnNext?.addEventListener("click", next);

  // Click outside closes
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

  // ---- Wheel zoom + drag pan (images only)
  if (stage) {
    stage.addEventListener(
      "wheel",
      (e) => {
        if (!lb.classList.contains("is-open")) return;
        if (lbVideo.style.display === "block") return; // no zoom on video

        e.preventDefault();

        const prevScale = scale;
        scale += e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        scale = clamp(scale, MIN_SCALE, MAX_SCALE);

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
      if (scale <= 1) return;
      if (lbVideo.style.display === "block") return;

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
})();