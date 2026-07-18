/*
 * startMenu.js — the app launcher. Reads from window.APP_REGISTRY (set up
 * in main.js) so it doesn't need to know about individual apps.
 */

const StartMenu = (() => {
  const menuEl = document.getElementById('start-menu');
  const overlayEl = document.getElementById('start-menu-overlay');
  const listEl = document.getElementById('start-menu-apps');
  const searchEl = document.getElementById('start-search-input');
  const startBtn = document.getElementById('start-btn');

  let apps = [];

  function renderList(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = apps.filter(a =>
      a.title.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q)
    );
    listEl.innerHTML = '';
    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-faint);font-size:12.5px;">no apps match "${filter}"</div>`;
      return;
    }
    filtered.forEach(app => {
      const row = document.createElement('div');
      row.className = 'start-app-row';
      row.innerHTML = `
        <div class="icon-glyph">${app.icon}</div>
        <div>
          <div class="name">${app.title}</div>
          <div class="desc">${app.desc || ''}</div>
        </div>`;
      row.onclick = () => { WM.open(app); close(); };
      listEl.appendChild(row);
    });
  }

  function open() {
    menuEl.classList.add('open');
    overlayEl.classList.add('open');
    startBtn.classList.add('active');
    searchEl.value = '';
    renderList();
    setTimeout(() => searchEl.focus(), 50);
  }
  function close() {
    menuEl.classList.remove('open');
    overlayEl.classList.remove('open');
    startBtn.classList.remove('active');
  }
  function toggle() {
    menuEl.classList.contains('open') ? close() : open();
  }

  function init(registeredApps) {
    apps = registeredApps;
    startBtn.addEventListener('click', toggle);
    overlayEl.addEventListener('click', close);
    searchEl.addEventListener('input', () => renderList(searchEl.value));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  return { init, open, close, toggle };
})();
