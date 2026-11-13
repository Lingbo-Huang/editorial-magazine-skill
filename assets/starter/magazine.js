(() => {
  'use strict';
  const pages = [...document.querySelectorAll('.dd-page')];
  const book = document.querySelector('.dd-magazine');
  const toolbar = document.querySelector('.dd-toolbar');
  const pagination = document.querySelector('.dd-pagination');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const modeButton = document.querySelector('#mode');
  const motionButton = document.querySelector('#motion');
  const themeButton = document.querySelector('#theme');
  const dialog = document.querySelector('#toc-dialog');
  const tocOpen = document.querySelector('#toc-open');
  const desktop = matchMedia('(min-width: 960px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sceneElements = [...document.querySelectorAll('[data-scene]')];
  const inView = new Set();
  let index = 0;
  let continuous = false;
  let userPaused = false;
  let printing = false;
  let clock = 0;
  let frameId = 0;
  let lastFrame = 0;
  let lastPaint = 0;
  let fieldRunning = false;
  const fieldScene = document.querySelector('[data-scene="field"]');
  const canvas = fieldScene.querySelector('canvas');
  const context = canvas.getContext('2d');
  let palette;
  let canvasWidth = 640;
  let canvasHeight = 480;

  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    palette = { blue: css.getPropertyValue('--dd-cover-blue').trim(), ink: css.getPropertyValue('--dd-ink').trim() };
  }

  function drawField(time) {
    if (!context) return;
    const scale = canvas.width / 640;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, 640, 480);
    const columns = desktop.matches ? 72 : 44;
    const rows = desktop.matches ? 20 : 13;
    const phase = time / 2400;
    context.lineWidth = 1;
    context.strokeStyle = palette.blue;
    context.globalAlpha = .35;
    context.beginPath();
    context.ellipse(320, 245, 273, 115, -.45, 0, Math.PI * 2);
    context.stroke();
    for (let row = 0; row < rows; row++) {
      const v = row / (rows - 1) * 2 - 1;
      for (let col = 0; col < columns; col++) {
        const u = col / (columns - 1);
        const wave = Math.sin(u * Math.PI * 2.4 + phase) * 48;
        const twist = u * Math.PI * 2 + phase * .45;
        const x = 52 + u * 530 + v * 27 * Math.sin(twist);
        const y = 307 - u * 125 + wave + v * (58 + 24 * Math.sin(twist)) * Math.cos(twist);
        const radius = 1 + (1 + Math.sin(twist + v)) * .65;
        context.globalAlpha = .35 + (v + 1) * .3;
        context.fillStyle = row > rows / 2 ? palette.blue : palette.ink;
        context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      }
    }
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.39996 + phase * .08;
      const x = 320 + Math.cos(angle) * (170 + i * 3);
      const y = 240 + Math.sin(angle) * (95 + i * 2);
      const size = 3 + (i % 4) * 2;
      context.globalAlpha = .25 + (i % 3) * .18; context.fillStyle = palette.blue;
      context.fillRect(x, y, size, size);
    }
    context.globalAlpha = 1;
  }

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !context) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvasWidth = Math.round(rect.width * dpr);
    canvasHeight = Math.round(canvasWidth * .75);
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth; canvas.height = canvasHeight;
    }
    drawField(clock);
  }

  function tick(now) {
    frameId = 0;
    if (!fieldRunning) return;
    if (lastFrame) clock += Math.min(now - lastFrame, 100);
    lastFrame = now;
    if (!lastPaint || now - lastPaint >= 1000 / 30) { drawField(clock); lastPaint = now; }
    frameId = requestAnimationFrame(tick);
  }

  function syncMotion() {
    const allowed = !userPaused && !reduced.matches && !document.hidden && !printing;
    for (const scene of sceneElements) {
      const running = allowed && inView.has(scene) && !scene.closest('.dd-page').hidden;
      scene.dataset.running = String(running);
    }
    fieldRunning = !!context && fieldScene.dataset.running === 'true';
    if (fieldRunning && !frameId) { lastFrame = 0; lastPaint = 0; frameId = requestAnimationFrame(tick); }
    if (!fieldRunning && frameId) { cancelAnimationFrame(frameId); frameId = 0; lastFrame = 0; }
    motionButton.textContent = reduced.matches ? '已减少动态效果' : userPaused ? '播放动图' : '暂停动图';
    motionButton.setAttribute('aria-pressed', String(userPaused || reduced.matches));
    motionButton.disabled = reduced.matches;
  }

  function normalized(value) {
    const bounded = Math.max(0, Math.min(value, pages.length - 1));
    return !continuous && desktop.matches && bounded > 0 ? 1 + Math.floor((bounded - 1) / 2) * 2 : bounded;
  }

  function render(focus = false, focusIndex = index) {
    index = normalized(index);
    const count = desktop.matches && index > 0 ? 2 : 1;
    document.body.dataset.mode = continuous ? 'continuous' : 'book';
    book.classList.toggle('dd-cover-view', index === 0);
    pages.forEach((page, n) => { page.hidden = !continuous && (n < index || n >= index + count); });
    previous.disabled = index === 0;
    next.disabled = index + count >= pages.length;
    pagination.hidden = continuous;
    document.querySelector('#position').textContent = continuous ? '连续阅读 · 试刊号' : index === 0 ? '封面 · 试刊号' : `${index}${count === 2 && index + 1 < pages.length ? `–${index + 1}` : ''} / ${pages.length - 1}`;
    modeButton.setAttribute('aria-pressed', String(continuous));
    modeButton.textContent = continuous ? '双页 / 单页阅读' : '连续阅读';
    document.querySelectorAll('#toc-links a').forEach((link, n) => {
      if (n === focusIndex) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    syncMotion(); sizeCanvas();
    if (focus) {
      pages[focusIndex].focus({ preventScroll: true });
      if (continuous) pages[focusIndex].scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function fromHash(focus = false) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const found = pages.findIndex(page => page.id === id);
    if (found < 0) return;
    index = found;
    render(focus, found);
  }
  function go(value) {
    const target = pages[Math.max(0, Math.min(value, pages.length - 1))];
    if (location.hash === `#${target.id}`) { index = value; render(true, value); }
    else location.hash = target.id;
  }
  function turn(direction) {
    if (direction > 0 && next.disabled || direction < 0 && previous.disabled) return;
    if (direction > 0) go(index === 0 ? 1 : index + (desktop.matches ? 2 : 1));
    else go(index - (desktop.matches && index > 1 ? 2 : 1));
  }

  for (const [n, page] of pages.entries()) {
    const link = document.createElement('a');
    link.href = `#${page.id}`; link.textContent = `${n === 0 ? '封面' : String(n).padStart(2, '0')}　${page.dataset.title}`;
    link.addEventListener('click', () => { dialog.close(); if (location.hash === link.hash) { index = n; render(true, n); } });
    document.querySelector('#toc-links').append(link);
  }
  tocOpen.addEventListener('click', () => dialog.showModal());
  document.querySelector('#toc-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => tocOpen.focus());
  previous.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  modeButton.addEventListener('click', () => {
    // Preserve the explicitly selected article; focusing a toolbar control may scroll.
    continuous = !continuous;
    render(true);
    history.replaceState(null, '', `#${pages[index].id}`);
  });
  motionButton.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  themeButton.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    themeButton.setAttribute('aria-pressed', String(dark)); themeButton.textContent = dark ? '浅色' : '深色';
    readPalette(); drawField(clock);
  });
  document.querySelector('#print').addEventListener('click', () => window.print());
  window.addEventListener('hashchange', () => fromHash(true));
  document.addEventListener('keydown', event => {
    if (continuous || dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1); }
  });
  desktop.addEventListener('change', () => render());
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('beforeprint', () => { printing = true; syncMotion(); });
  window.addEventListener('afterprint', () => { printing = false; syncMotion(); });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) inView.add(entry.target); else inView.delete(entry.target); });
    syncMotion();
  }, { threshold: .05 });
  sceneElements.forEach(scene => observer.observe(scene));
  const resizeObserver = new ResizeObserver(sizeCanvas);
  resizeObserver.observe(fieldScene);
  // Keep anchor targets below the wrapping toolbar, including enlarged text.
  const toolbarObserver = new ResizeObserver(entries => {
    const height = entries[0].borderBoxSize?.[0]?.blockSize;
    if (height) document.documentElement.style.setProperty('--dd-toolbar-height', `${height}px`);
  });
  toolbarObserver.observe(toolbar);
  window.addEventListener('pagehide', () => { if (frameId) cancelAnimationFrame(frameId); frameId = 0; fieldRunning = false; });
  window.addEventListener('pageshow', syncMotion);
  readPalette();
  if (context) { canvas.hidden = false; fieldScene.querySelector('.dd-field-poster').setAttribute('hidden', ''); drawField(0); }
  toolbar.hidden = false; pagination.hidden = false;
  fromHash(); render();
})();
