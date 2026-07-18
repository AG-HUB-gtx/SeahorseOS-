/*
 * apps/terminal.js — a small shell. Handles the usual suspects (ls, cd,
 * cat, mkdir, touch, rm, echo, pwd, clear, whoami, date, help) against VFS.
 * Not a real parser — just splits on spaces, so quoted args with spaces
 * in them won't work right. Fine for now.
 */

const TerminalApp = {
  id: 'terminal',
  title: 'Terminal',
  icon: '>_',
  width: 620,
  height: 400,
  singleton: false,

  mount(body, win) {
    let cwd = '/Home';
    const history = [];
    let histIdx = -1;

    body.innerHTML = `
      <style>
        .term-wrap { height:100%; background:#070b10; font-family:var(--font-mono); font-size:12.5px; padding:10px 12px; overflow-y:auto; }
        .term-line { white-space:pre-wrap; word-break:break-word; line-height:1.55; color:#c8d6dd; }
        .term-prompt-row { display:flex; gap:6px; }
        .term-prompt { color:var(--accent); flex:0 0 auto; white-space:nowrap; }
        .term-input { flex:1; background:transparent; border:none; outline:none; color:#e8f3f5; font-family:var(--font-mono); font-size:12.5px; }
        .term-err { color:var(--danger); }
        .term-dim { color:var(--text-faint); }
      </style>
      <div class="term-wrap">
        <div class="term-log"></div>
        <div class="term-prompt-row">
          <span class="term-prompt"></span>
          <input class="term-input" type="text" spellcheck="false" autocomplete="off">
        </div>
      </div>
    `;

    const wrap = body.querySelector('.term-wrap');
    const log = body.querySelector('.term-log');
    const promptEl = body.querySelector('.term-prompt');
    const input = body.querySelector('.term-input');

    function print(text, cls) {
      const div = document.createElement('div');
      div.className = 'term-line' + (cls ? ' ' + cls : '');
      div.textContent = text;
      log.appendChild(div);
      wrap.scrollTop = wrap.scrollHeight;
    }

    function prompt() {
      return `seahorse@os:${cwd.replace('/Home', '~')}$`;
    }
    function refreshPrompt() { promptEl.textContent = prompt(); }

    function resolvePath(arg) {
      if (!arg) return cwd;
      if (arg.startsWith('/')) return arg;
      if (arg === '..') {
        const parts = cwd.split('/').filter(Boolean);
        parts.pop();
        return '/' + parts.join('/');
      }
      if (arg === '~') return '/Home';
      return (cwd === '/' ? '' : cwd) + '/' + arg;
    }

    const commands = {
      help() {
        print('Available commands:');
        print('  ls [dir]        list directory contents');
        print('  cd <dir>        change directory');
        print('  pwd             print working directory');
        print('  cat <file>      print file contents');
        print('  echo <text>     print text (use > file to write)');
        print('  mkdir <dir>     create a directory');
        print('  touch <file>    create an empty file');
        print('  rm <path>       delete a file or empty directory');
        print('  whoami          who you are');
        print('  date            current date/time');
        print('  clear           clear the screen');
      },
      ls(args) {
        const target = resolvePath(args[0]);
        const items = VFS.list(target);
        if (!items) { print(`ls: cannot access '${args[0] || '.'}': not a directory`, 'term-err'); return; }
        if (items.length === 0) return;
        print(items.map(i => i.type === 'dir' ? i.name + '/' : i.name).join('   '));
      },
      cd(args) {
        const target = resolvePath(args[0] || '/Home');
        const node = VFS.resolve(target);
        if (!node || node.type !== 'dir') { print(`cd: ${args[0]}: no such directory`, 'term-err'); return; }
        cwd = target;
        refreshPrompt();
      },
      pwd() { print(cwd); },
      cat(args) {
        if (!args[0]) { print('cat: missing file operand', 'term-err'); return; }
        const content = VFS.readFile(resolvePath(args[0]));
        if (content === null) { print(`cat: ${args[0]}: no such file`, 'term-err'); return; }
        print(content || '(empty file)');
      },
      echo(args) {
        const line = args.join(' ');
        // super basic redirect support: `echo hello > file.txt`
        const gtIdx = args.indexOf('>');
        if (gtIdx !== -1) {
          const text = args.slice(0, gtIdx).join(' ');
          const file = args[gtIdx + 1];
          if (!file) { print('echo: syntax error near >', 'term-err'); return; }
          VFS.touch(resolvePath(file), text);
          return;
        }
        print(line);
      },
      mkdir(args) {
        if (!args[0]) { print('mkdir: missing operand', 'term-err'); return; }
        if (!VFS.mkdir(resolvePath(args[0]))) print(`mkdir: cannot create directory '${args[0]}'`, 'term-err');
      },
      touch(args) {
        if (!args[0]) { print('touch: missing operand', 'term-err'); return; }
        VFS.touch(resolvePath(args[0]), '');
      },
      rm(args) {
        if (!args[0]) { print('rm: missing operand', 'term-err'); return; }
        if (!VFS.remove(resolvePath(args[0]))) print(`rm: cannot remove '${args[0]}': no such file`, 'term-err');
      },
      whoami() { print('guest'); },
      date() { print(new Date().toString()); },
      clear() { log.innerHTML = ''; },
    };

    function run(raw) {
      const line = raw.trim();
      if (!line) return;
      print(prompt() + ' ' + line);
      history.push(line); histIdx = history.length;

      const [cmd, ...args] = line.split(/\s+/);
      if (commands[cmd]) {
        try { commands[cmd](args); }
        catch (e) { print('error: ' + e.message, 'term-err'); }
      } else {
        print(`command not found: ${cmd} (try 'help')`, 'term-err');
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        run(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length) { histIdx++; input.value = history[histIdx] || ''; }
      }
    });

    wrap.addEventListener('click', () => input.focus());

    print('Seahorse OS terminal — type "help" to see available commands.', 'term-dim');
    refreshPrompt();
    setTimeout(() => input.focus(), 50);
  }
};
