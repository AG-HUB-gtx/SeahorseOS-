/*
 * apps/blooket.js — placeholder window. Drop your actual app code in
 * `mount()` below — swap out the placeholder markup for whatever you're
 * building, same pattern as the other apps in js/apps/.
 */

const BlooketApp = {
  id: 'blooket',
  title: 'Blooket',
  icon: '🎮',
  width: 560,
  height: 400,
  singleton: false,

  mount(body) {
    body.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:var(--text-dim); text-align:center; padding:20px;">
        <div style="font-size:34px;">🎮</div>
        <div style="font-size:14px; color:var(--text);">Blooket app — placeholder</div>
        <div style="font-size:12px; color:var(--text-faint); max-width:320px;">
          Nothing wired up yet. Replace this mount() function in
          <code style="font-family:var(--font-mono); color:var(--accent);">js/apps/blooket.js</code>
          with your actual app code.
        </div>
      </div>
    `;

    // TODO: paste app code here — mount() gets a fresh, empty <div class="win-body">
    // to fill in, same as every other app in js/apps/
  }
};
