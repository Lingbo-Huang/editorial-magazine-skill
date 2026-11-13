(() => {
  'use strict';
  const pages = [...document.querySelectorAll('.dd-page')];
  const book = document.querySelector('.dd-magazine');
  const reader = document.querySelector('.dd-reader');
  const toolbar = document.querySelector('.dd-toolbar');
  const pagination = document.querySelector('.dd-pagination');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const dialog = document.querySelector('#toc-dialog');
  const tocOpen = document.querySelector('#toc-open');
  const cover = document.querySelector('#cover');
  const desktop = matchMedia('(min-width: 960px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const sceneElements = [...document.querySelectorAll('[data-scene]')];
  const inView = new Set();
  let index = 0;
  let selectedPage = 0;
  let printing = false;
  let clock = 0;
  let frameId = 0;
  let lastFrame = 0;
  let lastPaint = 0;
  let fieldRunning = false;
  let endTurn = null;
  let pointerStart = null;
  let textClickTimer = 0;
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
    const allowed = !reduced.matches && !document.hidden && !printing && !dialog.open;
    for (const scene of sceneElements) {
      scene.dataset.running = String(allowed && inView.has(scene) && !scene.closest('.dd-page').hidden);
    }
    fieldRunning = !!context && fieldScene.dataset.running === 'true';
    if (fieldRunning && !frameId) { lastFrame = 0; lastPaint = 0; frameId = requestAnimationFrame(tick); }
    if (!fieldRunning && frameId) { cancelAnimationFrame(frameId); frameId = 0; lastFrame = 0; }
  }

  function normalized(value) {
    const bounded = Math.max(0, Math.min(value, pages.length - 1));
    return desktop.matches && bounded > 0 ? 1 + Math.floor((bounded - 1) / 2) * 2 : bounded;
  }
  function render() {
    index = normalized(selectedPage);
    const count = desktop.matches && index > 0 ? 2 : 1;
    document.body.dataset.mode = 'book';
    reader.dataset.cover = String(index === 0);
    if (!endTurn) reader.dataset.turning = 'false';
    book.classList.toggle('dd-cover-view', index === 0);
    pages.forEach((page, n) => { page.hidden = n < index || n >= index + count; });
    previous.disabled = index === 0;
    next.disabled = index + count >= pages.length;
    pagination.hidden = index === 0;
    document.querySelector('#position').textContent = index === 0 ? '创刊号' : `${String(index).padStart(2, '0')}${count === 2 && index + 1 < pages.length ? ` — ${String(index + 1).padStart(2, '0')}` : ''}`;
    document.querySelectorAll('#toc-links a').forEach((link, n) => {
      if (n >= index && n < index + count) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    syncMotion(); sizeCanvas();
  }

  // Snapshot only the outgoing sheet. Live content remains semantic and selectable.
  function snapshot(page) {
    const copy = page.cloneNode(true);
    const originalLayers = page.querySelectorAll('.dd-layer, .dd-steam, .dd-book-leaf');
    const copiedLayers = copy.querySelectorAll('.dd-layer, .dd-steam, .dd-book-leaf');
    originalLayers.forEach((layer, n) => {
      copiedLayers[n].style.transform = getComputedStyle(layer).transform;
      copiedLayers[n].style.opacity = getComputedStyle(layer).opacity;
      copiedLayers[n].style.animation = 'none';
    });
    page.querySelectorAll('canvas').forEach((source, n) => {
      const target = copy.querySelectorAll('canvas')[n];
      target.getContext('2d')?.drawImage(source, 0, 0);
    });
    [copy, ...copy.querySelectorAll('[id]')].forEach(element => element.removeAttribute('id'));
    copy.removeAttribute('role'); copy.removeAttribute('tabindex');
    copy.hidden = false; copy.setAttribute('inert', '');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('[data-scene]').forEach(scene => { scene.dataset.running = 'false'; });
    copy.classList.add('dd-sheet-copy');
    return copy;
  }

  function animateTurn(old, direction) {
    if (reduced.matches || typeof book.animate !== 'function') return;
    const newPages = pages.filter(page => !page.hidden);
    const destination = direction > 0 ? newPages[0] : newPages[newPages.length - 1];
    const destinationRect = destination.getBoundingClientRect();
    const width = old.rect.width;
    const height = old.rect.height;
    const scaleX = destinationRect.width / width;
    const scaleY = destinationRect.height / height;
    const spread = desktop.matches && index > 0;
    let endLeft;
    if (direction > 0) endLeft = spread ? destinationRect.right : destinationRect.left + width;
    else endLeft = destinationRect.left - width;
    const deltaX = endLeft - old.rect.left;
    const deltaY = destinationRect.top - old.rect.top;
    const scene = document.createElement('div');
    scene.className = 'dd-flip-scene'; scene.setAttribute('aria-hidden', 'true'); scene.setAttribute('inert', '');
    if (old.stationary) {
      const still = old.stationary.copy;
      Object.assign(still.style, { position: 'absolute', left: `${old.stationary.rect.left}px`, top: `${old.stationary.rect.top}px`, width: `${old.stationary.rect.width}px`, height: `${old.stationary.rect.height}px` });
      scene.append(still);
    }
    const leaf = document.createElement('div');
    leaf.className = 'dd-flip-leaf';
    Object.assign(leaf.style, { left: `${old.rect.left}px`, top: `${old.rect.top}px`, width: `${width}px`, height: `${height}px`, transformOrigin: direction > 0 ? 'left top' : 'right top' });
    const front = document.createElement('div'); front.className = 'dd-leaf-face dd-leaf-front'; front.append(old.copy);
    const back = document.createElement('div'); back.className = 'dd-leaf-face dd-leaf-back'; back.append(snapshot(destination));
    // Lay out the reverse at its real destination size, then fit it to the
    // outgoing sheet. The parent finishes at reciprocal scale: no final reflow.
    Object.assign(back.style, {
      width: `${destinationRect.width}px`, height: `${destinationRect.height}px`, transformOrigin: 'left top',
      transform: `translateX(${width}px) rotateY(180deg) scale(${1 / scaleX}, ${1 / scaleY})`
    });
    leaf.append(front, back); scene.append(leaf); document.body.append(scene);
    reader.dataset.turning = 'true';
    const timing = { duration: 480, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' };
    const animation = leaf.animate([
      { transform: 'translate3d(0, 0, 0) rotateY(0deg)' },
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) rotateY(${direction > 0 ? -180 : 180}deg) scale(${scaleX}, ${scaleY})` }
    ], timing);
    const extras = [];
    for (const face of [front, back]) {
      const shade = document.createElement('div'); shade.className = 'dd-fold-shade'; face.append(shade);
      extras.push(shade.animate([{ opacity: 0 }, { opacity: .38, offset: .45 }, { opacity: 0 }], timing));
    }
    if (old.stationary) extras.push(old.stationary.copy.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], timing));
    if (old.wasCover || index === 0) extras.push(book.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: 400 }));
    const cleanup = () => {
      animation.cancel(); extras.forEach(item => item.cancel()); scene.remove();
      if (endTurn === cleanup) { endTurn = null; reader.dataset.turning = 'false'; }
    };
    endTurn = cleanup;
    animation.finished.then(cleanup, () => { scene.remove(); });
  }

  function navigate(value, updateHistory = true, animate = true) {
    clearTextClick();
    const target = Math.max(0, Math.min(value, pages.length - 1));
    const nextIndex = normalized(target);
    selectedPage = target;
    if (endTurn) endTurn();
    if (nextIndex === index) {
      if (updateHistory && location.hash !== `#${pages[target].id}`) history.pushState(null, '', `#${pages[target].id}`);
      if (animate) pages[target].focus({ preventScroll: true }); return;
    }
    window.getSelection()?.removeAllRanges();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const direction = nextIndex > index ? 1 : -1;
    const visible = pages.filter(page => !page.hidden);
    const turningPage = direction > 0 ? visible[visible.length - 1] : visible[0];
    const stationary = visible.find(page => page !== turningPage);
    const old = animate && !reduced.matches ? {
      copy: snapshot(turningPage), rect: turningPage.getBoundingClientRect(), wasCover: index === 0,
      stationary: stationary ? { copy: snapshot(stationary), rect: stationary.getBoundingClientRect() } : null
    } : null;
    index = nextIndex; render();
    if (updateHistory) history.pushState(null, '', `#${pages[target].id}`);
    if (animate) pages[target].focus({ preventScroll: true });
    if (old) animateTurn(old, direction);
  }
  function fromHash(animate = true) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) { navigate(0, false, animate); return; }
    const found = pages.findIndex(page => page.id === id);
    if (found >= 0) navigate(found, false, animate);
  }
  function turn(direction) {
    if (direction > 0 && next.disabled || direction < 0 && previous.disabled) return;
    navigate(direction > 0 ? index === 0 ? 1 : index + (desktop.matches ? 2 : 1) : index - (desktop.matches && index > 1 ? 2 : 1));
  }
  function interactive(target) {
    return !!target.closest('a, button, input, textarea, select, summary, video, audio, [contenteditable], [data-no-page-turn]');
  }
  function clearTextClick() { clearTimeout(textClickTimer); textClickTimer = 0; }
  book.addEventListener('pointerdown', event => {
    clearTextClick();
    pointerStart = event.button === 0 ? { x: event.clientX, y: event.clientY, selected: !window.getSelection()?.isCollapsed } : null;
  });
  book.addEventListener('pointercancel', () => { pointerStart = null; clearTextClick(); });
  document.addEventListener('selectionchange', () => { if (!window.getSelection()?.isCollapsed) clearTextClick(); });
  book.addEventListener('click', event => {
    const start = pointerStart; pointerStart = null;
    const page = event.target.closest('.dd-page');
    if (!page || interactive(event.target) || event.detail > 1 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    if (start?.selected) { window.getSelection()?.removeAllRanges(); return; }
    if (!window.getSelection()?.isCollapsed) return;
    if (!start && event.detail !== 0) return;
    if (index === 0) { navigate(1); return; }
    const rect = page.getBoundingClientRect();
    const direction = desktop.matches ? (page === pages[index] ? -1 : 1) : (event.clientX < rect.left + rect.width * .35 ? -1 : 1);
    // A brief delay on text lets a second click select a word without turning.
    // Images, blank paper, the cover and arrows remain immediate.
    if (event.detail > 0 && event.target.closest('p, h2, h3, figcaption, blockquote, .dd-running, .dd-folio')) {
      textClickTimer = setTimeout(() => { textClickTimer = 0; if (window.getSelection()?.isCollapsed) turn(direction); }, 250);
    } else turn(direction);
  });
  cover.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(1); }
  });
  cover.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduced.matches || index !== 0 || endTurn) return;
    // Measure the stationary surface, not the tilted page: no pointer feedback loop.
    const rect = book.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    cover.style.setProperty('--dd-cover-rx', `${(0.5 - y) * 3}deg`);
    cover.style.setProperty('--dd-cover-ry', `${(x - .5) * 4}deg`);
  });
  cover.addEventListener('pointerleave', () => { cover.style.removeProperty('--dd-cover-rx'); cover.style.removeProperty('--dd-cover-ry'); });

  for (const [n, page] of pages.entries()) {
    const link = document.createElement('a');
    link.href = `#${page.id}`; link.textContent = n === 0 ? '封面' : `${String(n).padStart(2, '0')}　${page.dataset.title}`;
    link.addEventListener('click', event => { event.preventDefault(); dialog.close(String(n)); });
    document.querySelector('#toc-links').append(link);
  }
  tocOpen.addEventListener('click', () => { clearTextClick(); dialog.returnValue = ''; dialog.showModal(); syncMotion(); });
  document.querySelector('#toc-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== '') navigate(Number(dialog.returnValue));
    else tocOpen.focus();
    syncMotion();
  });
  previous.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  window.addEventListener('hashchange', () => fromHash());
  document.addEventListener('keydown', event => {
    if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || interactive(event.target)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1); }
  });
  desktop.addEventListener('change', () => { clearTextClick(); if (endTurn) endTurn(); render(); });
  window.addEventListener('resize', () => { clearTextClick(); if (endTurn) endTurn(); });
  reduced.addEventListener('change', () => { if (endTurn) endTurn(); syncMotion(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTextClick(); if (endTurn) endTurn(); } syncMotion(); });
  window.addEventListener('beforeprint', () => { clearTextClick(); if (endTurn) endTurn(); printing = true; syncMotion(); });
  window.addEventListener('afterprint', () => { printing = false; syncMotion(); });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) inView.add(entry.target); else inView.delete(entry.target); });
    syncMotion();
  }, { threshold: .05 });
  sceneElements.forEach(scene => observer.observe(scene));
  const resizeObserver = new ResizeObserver(sizeCanvas); resizeObserver.observe(fieldScene);
  const toolbarObserver = new ResizeObserver(entries => {
    const height = entries[0].borderBoxSize?.[0]?.blockSize;
    if (height) document.documentElement.style.setProperty('--dd-toolbar-height', `${height}px`);
  });
  toolbarObserver.observe(toolbar);
  window.addEventListener('pagehide', () => { clearTextClick(); if (endTurn) endTurn(); if (frameId) cancelAnimationFrame(frameId); frameId = 0; fieldRunning = false; });
  window.addEventListener('pageshow', syncMotion);
  readPalette();
  if (context) { canvas.hidden = false; fieldScene.querySelector('.dd-field-poster').setAttribute('hidden', ''); drawField(0); }
  toolbar.hidden = false;
  cover.setAttribute('role', 'button'); cover.tabIndex = 0; cover.setAttribute('aria-label', '翻开 BaiLian 杂志');
  document.body.dataset.enhanced = 'true';
  render(); fromHash(false);
})();
