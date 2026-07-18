/*
 * windowManager.js — owns every open window: creating, dragging, resizing,
 * focus order, minimize/maximize/close. Taskbar and start menu just call
 * into WM to open/focus things, they don't touch the DOM directly.
 *
 * Kept as a single object with closures over `windows` rather than a class,
 * mostly because there's only ever one instance of this and a class felt
 * like ceremony for no reason.
 */

const WM = (() => {
  const layer = document.getElementById('window-layer');
  let windows = new Map();   // id -> { el, app, state }
  let zTop = 100;
  let idCounter = 0;

  const listeners = []; // onChange callbacks, taskbar subscribes to these

  function emitChange() {
    listeners.forEach(fn => fn(getState()));
  }
  function onChange(fn) { listeners.push(fn); }

  function getState() {
    return Array.from(windows.values()).map(w => ({
      id: w.id, title: w.title, icon: w.icon,
      minimized: w.el.classList.contains('minimized'),
      focused: w.el.classList.contains('focused'),
    }));
  }

  /**
   * open() — creates a new window for an app.
   * app = { id, title, icon, width, height, mount(bodyEl, win) }
   * `mount` is called once with the empty body element; the app is
   * responsible for filling it in and wiring up its own event handlers.
   */
  function open(app, opts = {}) {
    // if singleton app already has a window open, just focus it instead
    // of spawning a duplicate (messages/settings/etc want this behavior)
    if (app.singleton) {
      const existing = Array.from(windows.values()).find(w => w.appId === app.id);
      if (existing) { restore(existing.id); focus(existing.id); return existing.id; }
    }

    const id = 'win-' + (++idCounter);
    const el = document.createElement('div');
    el.className = 'os-window opening';
    el.style.width = (opts.width || app.width || 620) + 'px';
    el.style.height = (opts.height || app.height || 420) + 'px';

    // stagger new windows a bit so they don't all stack exactly on top
    // of each other — cheap trick, cycles through a handful of offsets
    const offset = (windows.size % 6) * 26;
    el.style.left = (80 + offset) + 'px';
    el.style.top = (60 + offset) + 'px';

    el.innerHTML = `
      <div class="win-titlebar">
        <span class="win-icon">${app.icon || ''}</span>
        <span class="win-title">${app.title}</span>
        <div class="win-controls">
          <button class="win-min" title="Minimize"></button>
          <button class="win-max" title="Maximize"></button>
          <button class="win-close" title="Close"></button>
        </div>
      </div>
      <div class="win-body"></div>
      <div class="resize-handle n"></div><div class="resize-handle s"></div>
      <div class="resize-handle e"></div><div class="resize-handle w"></div>
      <div class="resize-handle ne"></div><div class="resize-handle nw"></div>
      <div class="resize-handle se"></div><div class="resize-handle sw"></div>
    `;
    layer.appendChild(el);

    const record = { id, appId: app.id, title: app.title, icon: app.icon, el };
    windows.set(id, record);

    wireDrag(el);
    wireResize(el);
    el.querySelector('.win-close').onclick = () => close(id);
    el.querySelector('.win-min').onclick = () => minimize(id);
    el.querySelector('.win-max').onclick = () => toggleMaximize(id);
    el.addEventListener('mousedown', () => focus(id));

    const body = el.querySelector('.win-body');
    app.mount(body, { id, close: () => close(id), setTitle: t => setTitle(id, t) });

    focus(id);
    emitChange();

    // drop the open animation class once it's played, keeps it from
    // re-triggering weirdly if the element gets reflowed later
    setTimeout(() => el.classList.remove('opening'), 200);

    return id;
  }

  function setTitle(id, title) {
    const w = windows.get(id);
    if (!w) return;
    w.title = title;
    w.el.querySelector('.win-title').textContent = title;
    emitChange();
  }

  function close(id) {
    const w = windows.get(id);
    if (!w) return;
    w.el.remove();
    windows.delete(id);
    emitChange();
  }

  function focus(id) {
    windows.forEach(w => w.el.classList.remove('focused'));
    const w = windows.get(id);
    if (!w) return;
    w.el.classList.add('focused');
    w.el.style.zIndex = ++zTop;
    emitChange();
  }

  function minimize(id) {
    const w = windows.get(id);
    if (!w) return;
    w.el.classList.add('minimized');
    emitChange();
  }

  function restore(id) {
    const w = windows.get(id);
    if (!w) return;
    w.el.classList.remove('minimized');
  }

  function toggleFocusOrMinimize(id) {
    // taskbar click behavior: click a focused+open window -> minimize it,
    // click a minimized/unfocused one -> bring it up. standard taskbar UX.
    const w = windows.get(id);
    if (!w) return;
    const isMin = w.el.classList.contains('minimized');
    const isFocused = w.el.classList.contains('focused');
    if (isMin) { restore(id); focus(id); }
    else if (isFocused) { minimize(id); }
    else { focus(id); }
  }

  function toggleMaximize(id) {
    const w = windows.get(id);
    if (!w) return;
    if (w._premax) {
      Object.assign(w.el.style, w._premax);
      w._premax = null;
    } else {
      w._premax = {
        left: w.el.style.left, top: w.el.style.top,
        width: w.el.style.width, height: w.el.style.height,
      };
      w.el.style.left = '0px'; w.el.style.top = '0px';
      w.el.style.width = '100%'; w.el.style.height = '100%';
    }
  }

  // -- dragging -------------------------------------------------------
  function wireDrag(el) {
    const bar = el.querySelector('.win-titlebar');
    let sx, sy, ox, oy, dragging = false;

    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-controls')) return; // don't drag from buttons
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      el.style.left = (ox + dx) + 'px';
      // clamp to not go above the very top / below the taskbar, otherwise
      // it's real easy to drag a window's titlebar off-screen and get stuck
      el.style.top = Math.max(0, oy + dy) + 'px';
    }
    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
  }

  // -- resizing ---------------------------------------------------------
  function wireResize(el) {
    el.querySelectorAll('.resize-handle').forEach(handle => {
      const dir = [...handle.classList].find(c => c !== 'resize-handle');
      let sx, sy, sw, sh, sl, st, active = false;

      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        active = true;
        sx = e.clientX; sy = e.clientY;
        sw = el.offsetWidth; sh = el.offsetHeight;
        sl = el.offsetLeft; st = el.offsetTop;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      function onMove(e) {
        if (!active) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        const minW = 280, minH = 180;
        if (dir.includes('e')) el.style.width = Math.max(minW, sw + dx) + 'px';
        if (dir.includes('s')) el.style.height = Math.max(minH, sh + dy) + 'px';
        if (dir.includes('w')) {
          const w = Math.max(minW, sw - dx);
          el.style.width = w + 'px';
          el.style.left = (sl + (sw - w)) + 'px';
        }
        if (dir.includes('n')) {
          const h = Math.max(minH, sh - dy);
          el.style.height = h + 'px';
          el.style.top = (st + (sh - h)) + 'px';
        }
      }
      function onUp() {
        active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
    });
  }

  return { open, close, focus, minimize, restore, toggleMaximize, toggleFocusOrMinimize, setTitle, onChange, getState };
})();
