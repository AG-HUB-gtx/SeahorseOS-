/*
 * main.js — boots the "OS": fake POST sequence, registers apps, wires up
 * desktop icons + context menu. Entry point, runs on DOMContentLoaded.
 */

const APP_REGISTRY = [
  { ...FileExplorerApp, desc: 'Browse your files' },
  { ...TerminalApp,     desc: 'Command line' },
  { ...MessagesApp,     desc: 'Chat with contacts' },
  { ...BrowserApp,      desc: 'Browse the web' },
  { ...BlooketApp,      desc: 'Games' },
  { ...SettingsApp,     desc: 'Wallpaper & theme' },
];

// desktop icons — subset of the registry, in the order they should appear.
// kept separate from APP_REGISTRY because eventually not every app needs
// a desktop shortcut (e.g. some might be launcher-only)
const DESKTOP_ICON_IDS = ['file-explorer', 'terminal', 'messages', 'browser', 'blooket'];

function renderDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  DESKTOP_ICON_IDS.forEach(id => {
    const app = APP_REGISTRY.find(a => a.id === id);
    if (!app) return;
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.innerHTML = `<div class="icon-glyph">${app.icon}</div><span class="label">${app.title}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
    });
    el.addEventListener('dblclick', () => WM.open(app));
    container.appendChild(el);
  });
}

// desktop right-click menu — mostly a nice-to-have, wallpaper shortcut +
// a "new folder" that drops into the VFS root's Home dir
function wireContextMenu() {
  const menu = document.getElementById('context-menu');
  const desktop = document.getElementById('desktop');

  const items = [
    { label: 'New Folder', action: () => { const n = prompt('Folder name:'); if (n) VFS.mkdir('/Home/' + n); } },
    { label: 'Open Terminal', action: () => WM.open(TerminalApp) },
    { sep: true },
    { label: 'Settings', action: () => WM.open(SettingsApp) },
    { label: 'Refresh', action: () => location.reload() },
  ];

  desktop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      if (item.sep) { li.className = 'sep'; }
      else { li.textContent = item.label; li.onclick = () => { item.action(); menu.classList.remove('open'); }; }
      menu.appendChild(li);
    });
    menu.style.left = e.clientX + 'px';
    menu.style.top = (e.clientY - menu.offsetHeight) + 'px'; // offsetHeight is 0 pre-open, close enough — flips itself into view on second click if near bottom edge
    menu.classList.add('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));

  desktop.addEventListener('click', (e) => {
    if (e.target === desktop) document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  });
}

// fake boot sequence — purely cosmetic, just a bit of a delay + status text
// so the OS feels like it's doing something on load instead of just
// snapping into view
function boot() {
  const screen = document.getElementById('boot-screen');
  const statusEl = document.getElementById('boot-status');
  const barFill = document.getElementById('boot-bar-fill');

  const steps = [
    'initializing kernel modules…',
    'mounting virtual filesystem…',
    'starting window manager…',
    'loading user preferences…',
    'ready.',
  ];

  let i = 0;
  const stepInterval = setInterval(() => {
    statusEl.textContent = steps[i];
    barFill.style.width = `${((i + 1) / steps.length) * 100}%`;
    i++;
    if (i >= steps.length) {
      clearInterval(stepInterval);
      setTimeout(() => screen.classList.add('hidden'), 350);
    }
  }, 320);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDesktopIcons();
  wireContextMenu();
  Taskbar.init();
  StartMenu.init(APP_REGISTRY);
  boot();

  // open File Explorer by default so the desktop doesn't feel totally
  // empty on first boot — comment this out if you'd rather land on a
  // clean desktop
  setTimeout(() => WM.open(FileExplorerApp), 900);
});
