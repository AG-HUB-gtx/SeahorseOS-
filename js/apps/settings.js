/*
 * apps/settings.js — wallpaper switcher + accent color picker.
 * Both just toggle a class/CSS var on #desktop / :root and persist the
 * choice so it survives a reload. No "real" settings schema, would be
 * overkill for two options.
 */

const SettingsApp = {
  id: 'settings',
  title: 'Settings',
  icon: '⚙',
  width: 480,
  height: 420,
  singleton: true, // only one settings window makes sense at a time

  mount(body) {
    const desktop = document.getElementById('desktop');
    const savedWallpaper = localStorage.getItem('seahorse-os-wallpaper') || 'nebula';
    const savedAccent = localStorage.getItem('seahorse-os-accent') || '#00e5c7';

    const wallpapers = [
      { id: 'nebula', label: 'Nebula', swatch: 'linear-gradient(160deg,#0a0f1c,#131a2c 45%,#0a1622)' },
      { id: 'abyss',  label: 'Abyss',  swatch: 'radial-gradient(circle at 50% 110%, #0b3a3c, #050a12 65%)' },
      { id: 'grid',   label: 'Grid',   swatch: 'repeating-linear-gradient(0deg,#0d1620,#0d1620 6px,#122030 6px,#122030 7px)' },
    ];
    const accents = ['#00e5c7', '#3a8dff', '#ff5d5d', '#ffb454', '#c792ea'];

    body.innerHTML = `
      <style>
        .set-wrap { padding:20px; font-size:13px; }
        .set-section { margin-bottom:24px; }
        .set-label { font-size:11.5px; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-faint); margin-bottom:10px; }
        .set-wallpapers { display:flex; gap:10px; }
        .set-wp { width:84px; height:56px; border-radius:8px; cursor:pointer; border:2px solid var(--border); position:relative; }
        .set-wp.selected { border-color:var(--accent); }
        .set-wp span { position:absolute; bottom:4px; left:6px; font-size:10px; color:#cfd8dc; text-shadow:0 1px 2px rgba(0,0,0,0.8); }
        .set-accents { display:flex; gap:10px; }
        .set-accent { width:30px; height:30px; border-radius:50%; cursor:pointer; border:2px solid transparent; }
        .set-accent.selected { border-color:#fff; }
        .set-about { font-size:11.5px; color:var(--text-faint); line-height:1.6; padding-top:8px; border-top:1px solid var(--border-soft); }
      </style>
      <div class="set-wrap">
        <div class="set-section">
          <div class="set-label">Wallpaper</div>
          <div class="set-wallpapers">
            ${wallpapers.map(w => `<div class="set-wp" data-id="${w.id}" style="background:${w.swatch}"><span>${w.label}</span></div>`).join('')}
          </div>
        </div>
        <div class="set-section">
          <div class="set-label">Accent color</div>
          <div class="set-accents">
            ${accents.map(c => `<div class="set-accent" data-color="${c}" style="background:${c}"></div>`).join('')}
          </div>
        </div>
        <div class="set-about">
          Seahorse OS — build 0.4.2-dev<br>
          A browser-based desktop environment. Settings save locally to this browser.
        </div>
      </div>
    `;

    function applyWallpaper(id) {
      wallpapers.forEach(w => desktop.classList.remove('wallpaper-' + w.id));
      desktop.classList.add('wallpaper-' + id);
      localStorage.setItem('seahorse-os-wallpaper', id);
      body.querySelectorAll('.set-wp').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
    }
    function applyAccent(color) {
      document.documentElement.style.setProperty('--accent', color);
      localStorage.setItem('seahorse-os-accent', color);
      body.querySelectorAll('.set-accent').forEach(el => el.classList.toggle('selected', el.dataset.color === color));
    }

    body.querySelectorAll('.set-wp').forEach(el => el.onclick = () => applyWallpaper(el.dataset.id));
    body.querySelectorAll('.set-accent').forEach(el => el.onclick = () => applyAccent(el.dataset.color));

    applyWallpaper(savedWallpaper);
    applyAccent(savedAccent);
  }
};

// apply saved theme immediately on boot, before any window opens —
// otherwise you get a flash of default teal on every reload
(function applySavedThemeEarly() {
  const accent = localStorage.getItem('seahorse-os-accent');
  if (accent) document.documentElement.style.setProperty('--accent', accent);
})();
