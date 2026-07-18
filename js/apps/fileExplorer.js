/*
 * apps/fileExplorer.js — simple two-pane-less file browser over VFS.
 * No drag-and-drop between folders yet (TODO), just navigate + create/delete.
 */

const FileExplorerApp = {
  id: 'file-explorer',
  title: 'File Explorer',
  icon: '📁',
  width: 640,
  height: 440,
  singleton: false,

  mount(body, win) {
    let cwd = '/Home';

    body.innerHTML = `
      <style>
        .fe-wrap { display:flex; flex-direction:column; height:100%; font-size:13px; }
        .fe-toolbar { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--border-soft); flex:0 0 auto; }
        .fe-toolbar button { background:var(--bg-raised); border:1px solid var(--border); color:var(--text-dim); border-radius:6px; padding:5px 9px; cursor:pointer; font-size:12px; }
        .fe-toolbar button:hover { color:var(--text); border-color:var(--accent); }
        .fe-path { font-family:var(--font-mono); font-size:11.5px; color:var(--text-faint); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fe-grid { flex:1; overflow:auto; padding:14px; display:flex; flex-wrap:wrap; align-content:flex-start; gap:4px; }
        .fe-item { width:88px; padding:10px 4px; border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; text-align:center; }
        .fe-item:hover { background:rgba(255,255,255,0.05); }
        .fe-item .glyph { font-size:26px; }
        .fe-item .name { font-size:11px; color:var(--text); word-break:break-word; line-height:1.25; }
        .fe-empty { color:var(--text-faint); font-size:12.5px; padding:30px; text-align:center; width:100%; }
      </style>
      <div class="fe-wrap">
        <div class="fe-toolbar">
          <button data-act="up">&uarr; Up</button>
          <button data-act="mkdir">+ Folder</button>
          <button data-act="touch">+ File</button>
          <span class="fe-path"></span>
        </div>
        <div class="fe-grid"></div>
      </div>
    `;

    const grid = body.querySelector('.fe-grid');
    const pathEl = body.querySelector('.fe-path');

    function render() {
      pathEl.textContent = cwd;
      win.setTitle('File Explorer — ' + cwd.split('/').pop());
      const items = VFS.list(cwd) || [];
      grid.innerHTML = '';
      if (items.length === 0) {
        grid.innerHTML = '<div class="fe-empty">This folder is empty.</div>';
        return;
      }
      // dirs first, then files, alphabetical within each — matches what
      // basically every file manager does and nobody complains about
      items.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === 'dir' ? -1 : 1));
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'fe-item';
        el.innerHTML = `<div class="glyph">${item.type === 'dir' ? '📁' : '📄'}</div><div class="name">${item.name}</div>`;
        el.addEventListener('dblclick', () => {
          if (item.type === 'dir') {
            cwd = cwd + '/' + item.name;
            render();
          } else {
            openFilePreview(item.name);
          }
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (confirm(`Delete "${item.name}"?`)) { VFS.remove(cwd + '/' + item.name); render(); }
        });
        grid.appendChild(el);
      });
    }

    function openFilePreview(name) {
      const content = VFS.readFile(cwd + '/' + name);
      alert(name + '\n\n' + (content || '(empty file)')); // quick and dirty, a real preview pane is a TODO
    }

    body.querySelector('[data-act="up"]').onclick = () => {
      if (cwd === '' || cwd === '/') return;
      const parts = cwd.split('/').filter(Boolean);
      parts.pop();
      cwd = '/' + parts.join('/');
      render();
    };
    body.querySelector('[data-act="mkdir"]').onclick = () => {
      const name = prompt('New folder name:');
      if (name) { VFS.mkdir(cwd + '/' + name); render(); }
    };
    body.querySelector('[data-act="touch"]').onclick = () => {
      const name = prompt('New file name:');
      if (name) { VFS.touch(cwd + '/' + name, ''); render(); }
    };

    render();
  }
};
