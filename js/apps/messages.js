/*
 * apps/messages.js — a local-only messaging UI. There's no backend/socket
 * here, it's a client-side contact list + thread view with canned replies
 * so the app feels alive. Swap `fakeReply()` out for a real API call
 * whenever there's actually a server to talk to.
 */

const MessagesApp = {
  id: 'messages',
  title: 'Messages',
  icon: '💬',
  width: 680,
  height: 460,
  singleton: true,

  mount(body) {
    const STORAGE_KEY = 'seahorse-os-messages-v1';

    const defaultContacts = [
      { id: 'nova', name: 'Nova', status: 'online', avatar: '🌊', messages: [
        { from: 'them', text: 'hey — new build is live, let me know if the taskbar feels laggy' },
      ]},
      { id: 'reef', name: 'Reef', status: 'away', avatar: '🐚', messages: [
        { from: 'them', text: 'pushed the wallpaper switcher, check settings' },
      ]},
      { id: 'echo', name: 'Echo', status: 'offline', avatar: '🐬', messages: [] },
    ];

    let contacts = load();
    let activeId = contacts[0]?.id;

    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore, fall through to defaults */ }
      return defaultContacts;
    }
    function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)); }

    body.innerHTML = `
      <style>
        .msg-wrap { display:flex; height:100%; font-size:13px; }
        .msg-sidebar { width:190px; flex:0 0 auto; border-right:1px solid var(--border-soft); overflow-y:auto; }
        .msg-contact { display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; }
        .msg-contact:hover { background:rgba(255,255,255,0.04); }
        .msg-contact.active { background:var(--bg-raised); }
        .msg-avatar { width:30px; height:30px; border-radius:50%; background:var(--bg-raised); display:flex; align-items:center; justify-content:center; font-size:15px; flex:0 0 auto; }
        .msg-cname { font-size:12.5px; }
        .msg-status { font-size:10px; color:var(--text-faint); }
        .msg-status.online { color:var(--accent); }
        .msg-main { flex:1; display:flex; flex-direction:column; min-width:0; }
        .msg-thread { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:8px; }
        .msg-bubble { max-width:70%; padding:8px 11px; border-radius:12px; font-size:12.5px; line-height:1.4; }
        .msg-bubble.them { background:var(--bg-raised); align-self:flex-start; border-bottom-left-radius:3px; }
        .msg-bubble.me { background:var(--accent-dim); color:#d6fff7; align-self:flex-end; border-bottom-right-radius:3px; }
        .msg-inputrow { display:flex; gap:8px; padding:10px; border-top:1px solid var(--border-soft); }
        .msg-inputrow input { flex:1; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:8px 12px; color:var(--text); outline:none; font-size:12.5px; }
        .msg-inputrow button { background:var(--accent); border:none; border-radius:8px; padding:0 14px; color:#02201c; font-weight:600; cursor:pointer; }
        .msg-empty { color:var(--text-faint); text-align:center; margin-top:40px; font-size:12px; }
      </style>
      <div class="msg-wrap">
        <div class="msg-sidebar"></div>
        <div class="msg-main">
          <div class="msg-thread"></div>
          <div class="msg-inputrow">
            <input type="text" placeholder="Type a message&hellip;">
            <button>Send</button>
          </div>
        </div>
      </div>
    `;

    const sidebar = body.querySelector('.msg-sidebar');
    const thread = body.querySelector('.msg-thread');
    const input = body.querySelector('.msg-inputrow input');
    const sendBtn = body.querySelector('.msg-inputrow button');

    function renderSidebar() {
      sidebar.innerHTML = '';
      contacts.forEach(c => {
        const row = document.createElement('div');
        row.className = 'msg-contact' + (c.id === activeId ? ' active' : '');
        row.innerHTML = `
          <div class="msg-avatar">${c.avatar}</div>
          <div>
            <div class="msg-cname">${c.name}</div>
            <div class="msg-status ${c.status}">${c.status}</div>
          </div>`;
        row.onclick = () => { activeId = c.id; renderSidebar(); renderThread(); };
        sidebar.appendChild(row);
      });
    }

    function renderThread() {
      const c = contacts.find(c => c.id === activeId);
      thread.innerHTML = '';
      if (!c || c.messages.length === 0) {
        thread.innerHTML = '<div class="msg-empty">No messages yet — say hi.</div>';
        return;
      }
      c.messages.forEach(m => {
        const b = document.createElement('div');
        b.className = 'msg-bubble ' + (m.from === 'me' ? 'me' : 'them');
        b.textContent = m.text;
        thread.appendChild(b);
      });
      thread.scrollTop = thread.scrollHeight;
    }

    function send() {
      const text = input.value.trim();
      if (!text) return;
      const c = contacts.find(c => c.id === activeId);
      c.messages.push({ from: 'me', text });
      input.value = '';
      renderThread();
      save();

      // canned reply after a beat, purely cosmetic — makes the app feel
      // less dead. remove this whole block once there's a real backend.
      if (c.status !== 'offline') {
        setTimeout(() => {
          c.messages.push({ from: 'them', text: fakeReply() });
          renderThread();
          save();
        }, 900 + Math.random() * 900);
      }
    }

    function fakeReply() {
      const replies = ['got it 👍', 'lol true', 'checking now', 'one sec', 'nice', 'makes sense to me'];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    sendBtn.onclick = send;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    renderSidebar();
    renderThread();
  }
};
