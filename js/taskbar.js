/*
 * taskbar.js — renders running-app buttons from WM state and keeps the
 * clock ticking. Doesn't own any app logic, just reflects WM + dispatches
 * clicks back into it.
 */

const Taskbar = (() => {
  const runningEl = document.getElementById('taskbar-running');
  const clockEl = document.getElementById('tray-clock');
  const searchInput = document.getElementById('taskbar-search-input');

  function render(state) {
    runningEl.innerHTML = '';
    state.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'taskbar-app-btn' + (w.focused && !w.minimized ? ' active' : '');
      btn.innerHTML = `<span class="dot"></span><span>${w.icon || ''} ${w.title}</span>`;
      btn.onclick = () => WM.toggleFocusOrMinimize(w.id);
      runningEl.appendChild(btn);
    });
  }

  function tick() {
    const d = new Date();
    // Intl.DateTimeFormat would be the "correct" way to do this but padStart
    // is one line and I don't need locale support for a toy taskbar clock
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}`;
  }

  function init() {
    WM.onChange(render);
    tick();
    setInterval(tick, 1000 * 10); // 10s is plenty for a minute-resolution clock

    // taskbar search just proxies into the start menu search + opens it
    searchInput.addEventListener('focus', () => {
      StartMenu.open();
      const sm = document.getElementById('start-search-input');
      sm.value = searchInput.value;
      sm.dispatchEvent(new Event('input'));
      sm.focus();
    });
  }

  return { init };
})();
