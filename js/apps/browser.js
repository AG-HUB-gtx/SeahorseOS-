/*
 * apps/browser.js — a URL bar + iframe. This is a client-only "browser",
 * not a proxy: it just points an <iframe> at whatever URL you give it, in
 * the visitor's own browser. Two real limitations worth knowing about:
 *
 *   1. Lots of sites send X-Frame-Options / CSP frame-ancestors headers
 *      that block iframing entirely — those will show a blank frame or a
 *      browser error, there's nothing we can do about that client-side.
 *   2. It can only reach whatever the network already allows through —
 *      this has no server component, so it does not get around any
 *      network-level or DNS-level blocking. It's just a window.
 *
 * If a "reach sites the network blocks" style proxy is ever actually
 * needed, that's a server-side piece (a real HTTP(S) relay) and a much
 * bigger — and more sensitive — build than this file.
 */

const BrowserApp = {
  id: 'browser',
  title: 'Browser',
  icon: '🌐',
  width: 760,
  height: 520,
  singleton: false,

  mount(body, win) {
    const history = [];
    let histIdx = -1;
    const HOME = 'https://en.wikipedia.org/wiki/Main_Page';

    body.innerHTML = `
      <style>
        .br-wrap { display:flex; flex-direction:column; height:100%; }
        .br-bar { display:flex; align-items:center; gap:6px; padding:8px; border-bottom:1px solid var(--border-soft); flex:0 0 auto; }
        .br-bar button { width:26px; height:26px; border-radius:6px; background:var(--bg-raised); border:1px solid var(--border); color:var(--text-dim); cursor:pointer; }
        .br-bar button:disabled { opacity:0.35; cursor:default; }
        .br-url { flex:1; height:28px; border-radius:8px; background:var(--bg-raised); border:1px solid var(--border); color:var(--text); padding:0 10px; font-size:12.5px; outline:none; font-family:var(--font-mono); }
        .br-url:focus { border-color:var(--accent-blue); }
        .br-frame-wrap { flex:1; position:relative; background:#fff; }
        .br-frame-wrap iframe { width:100%; height:100%; border:none; }
        .br-note { position:absolute; bottom:8px; left:8px; right:8px; background:rgba(13,20,29,0.92); color:var(--text-dim); font-size:11px; padding:8px 10px; border-radius:8px; border:1px solid var(--border); display:none; }
      </style>
      <div class="br-wrap">
        <div class="br-bar">
          <button data-act="back" disabled>&larr;</button>
          <button data-act="fwd" disabled>&rarr;</button>
          <button data-act="reload">&#8635;</button>
          <input class="br-url" type="text" spellcheck="false">
        </div>
        <div class="br-frame-wrap">
          <iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
          <div class="br-note">This site refused to load in an embedded window (X-Frame-Options). Not something we can bypass client-side.</div>
        </div>
      </div>
    `;

    const urlInput = body.querySelector('.br-url');
    const iframe = body.querySelector('iframe');
    const note = body.querySelector('.br-note');
    const backBtn = body.querySelector('[data-act="back"]');
    const fwdBtn = body.querySelector('[data-act="fwd"]');

    function normalize(raw) {
      let u = raw.trim();
      if (!u) return null;
      if (!/^https?:\/\//i.test(u)) {
        // heuristic: looks like "word.word" -> treat as URL, else search engine
        u = /\s/.test(u) || !u.includes('.') ? 'https://duckduckgo.com/?q=' + encodeURIComponent(u) : 'https://' + u;
      }
      return u;
    }

    function go(raw, pushHistory = true) {
      const url = normalize(raw);
      if (!url) return;
      note.style.display = 'none';
      urlInput.value = url;
      iframe.src = url;
      win.setTitle('Browser');

      if (pushHistory) {
        history.splice(histIdx + 1); // drop any forward history once you navigate anew
        history.push(url);
        histIdx = history.length - 1;
      }
      backBtn.disabled = histIdx <= 0;
      fwdBtn.disabled = histIdx >= history.length - 1;

      // best-effort detection of a blocked frame — can't read cross-origin
      // iframe content, so this is just "did it stay blank a while"
      clearTimeout(iframe._loadTimer);
      iframe._loadTimer = setTimeout(() => {
        try {
          // cross-origin access throws, which is expected/fine — we're
          // just using the throw/no-throw as a rough same-origin check
          const doc = iframe.contentDocument;
          if (doc && doc.body && doc.body.innerHTML.trim() === '') note.style.display = 'block';
        } catch (e) { /* cross-origin load, assume it worked */ }
      }, 2500);
    }

    backBtn.onclick = () => { if (histIdx > 0) { histIdx--; go(history[histIdx], false); backBtn.disabled = histIdx <= 0; fwdBtn.disabled = false; } };
    fwdBtn.onclick = () => { if (histIdx < history.length - 1) { histIdx++; go(history[histIdx], false); fwdBtn.disabled = histIdx >= history.length - 1; backBtn.disabled = false; } };
    body.querySelector('[data-act="reload"]').onclick = () => { iframe.src = iframe.src; };
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') go(urlInput.value); });

    go(HOME);
  }
};
