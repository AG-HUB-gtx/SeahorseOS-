/*
 * vfs.js — a very small virtual filesystem.
 *
 * Not trying to be POSIX-accurate here, just enough of a tree structure
 * that Terminal and File Explorer can share state and it survives a
 * refresh via localStorage. Everything lives in memory as a plain object
 * graph, {type: 'dir'|'file', ...} — simplest thing that could work.
 *
 * Paths are always absolute and use '/'. No symlinks, no permissions,
 * no mtimes yet. If this needs to get more real later it should probably
 * become IndexedDB instead of localStorage (5MB cap will bite eventually).
 */

const VFS = (() => {
  const STORAGE_KEY = 'seahorse-os-vfs-v1';

  function defaultTree() {
    return {
      type: 'dir',
      children: {
        'Home': {
          type: 'dir',
          children: {
            'Documents': { type: 'dir', children: {} },
            'Downloads': { type: 'dir', children: {} },
            'readme.txt': {
              type: 'file',
              content: 'Welcome to Seahorse OS.\n\nThis is a fake but persistent file system — ' +
                        'anything you create here sticks around in localStorage between reloads.\n' +
                        'Try the Terminal app: ls, cd, cat, mkdir, touch, echo, rm.\n'
            },
          }
        },
        'Apps': { type: 'dir', children: {} },
      }
    };
  }

  let root = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('vfs: failed to load from storage, resetting', e);
    }
    return defaultTree();
  }

  function persist() {
    // fires on every write, fine for our scale but a real impl would debounce this
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  }

  function splitPath(path) {
    return path.split('/').filter(Boolean);
  }

  // walks the tree and returns the node at `path`, or null
  function resolve(path) {
    const parts = splitPath(path);
    let node = root;
    for (const part of parts) {
      if (node.type !== 'dir' || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function parentOf(path) {
    const parts = splitPath(path);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');
    return { parent: resolve(parentPath) || root, name };
  }

  function list(path) {
    const node = resolve(path);
    if (!node || node.type !== 'dir') return null;
    return Object.entries(node.children).map(([name, n]) => ({
      name, type: n.type,
      size: n.type === 'file' ? (n.content || '').length : null,
    }));
  }

  function mkdir(path) {
    const { parent, name } = parentOf(path);
    if (!name) return false;
    if (parent.children[name]) return false; // already exists
    parent.children[name] = { type: 'dir', children: {} };
    persist();
    return true;
  }

  function touch(path, content = '') {
    const { parent, name } = parentOf(path);
    if (!name) return false;
    if (!parent.children[name]) {
      parent.children[name] = { type: 'file', content };
    } else if (parent.children[name].type === 'file') {
      parent.children[name].content = content;
    } else {
      return false; // can't touch a dir
    }
    persist();
    return true;
  }

  function readFile(path) {
    const node = resolve(path);
    if (!node || node.type !== 'file') return null;
    return node.content || '';
  }

  function remove(path) {
    const { parent, name } = parentOf(path);
    if (!name || !parent.children[name]) return false;
    delete parent.children[name];
    persist();
    return true;
  }

  function exists(path) {
    return resolve(path) !== null;
  }

  function reset() {
    root = defaultTree();
    persist();
  }

  return { list, mkdir, touch, readFile, remove, exists, resolve, reset };
})();
