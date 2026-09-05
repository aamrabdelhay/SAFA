(() => {
  const blobHost = (src) => {
    try { return /\.blob\.vercel-storage\.com$/i.test(new URL(src, location.href).hostname); } catch { return false; }
  };
  const proxyPath = (src) => {
    try {
      const u = new URL(src, location.href);
      if (u.pathname === '/api/blob') return u.searchParams.get('path') || '';
      if (u.pathname.startsWith('/api/blob/')) return decodeURIComponent(u.pathname.slice('/api/blob/'.length));
      if (blobHost(src)) return u.pathname.replace(/^\/+/, '');
      return '';
    } catch { return ''; }
  };
  const toProxy = (src) => {
    const path = proxyPath(src);
    return path ? `/api/blob?path=${encodeURIComponent(path)}` : src;
  };
  const fixImage = (img) => {
    if (!(img instanceof HTMLImageElement) || img.dataset.blobFixed === '1') return;
    const src = img.getAttribute('src');
    if (!src) return;
    const proxy = toProxy(src);
    if (proxy && proxy !== src) {
      img.dataset.blobFixed = '1';
      img.src = proxy;
    }
  };

  const previewBox = (input) => {
    let box = input.parentElement?.querySelector('.safa-upload-preview');
    if (!box) {
      box = document.createElement('div');
      box.className = 'safa-upload-preview';
      input.parentElement?.appendChild(box);
    }
    return box;
  };

  const showPreview = (input, file) => {
    const box = previewBox(input);
    box.replaceChildren();
    if (!file || !file.type.startsWith('image/')) return;
    const img = document.createElement('img');
    img.alt = 'Selected image preview';
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    box.appendChild(img);
  };

  const addConfirm = (input) => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || input.dataset.confirmBound === '1') return;
    input.dataset.confirmBound = '1';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      showPreview(input, file);
      let button = input.parentElement?.querySelector('.safa-confirm-upload');
      if (!file || !file.type.startsWith('image/')) {
        if (button) button.remove();
        return;
      }
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'safa-confirm-upload';
        button.textContent = /logo/i.test(input.parentElement?.textContent || '') ? 'CONFIRM & SAVE LOGO' : 'CONFIRM IMAGE';
        input.parentElement?.appendChild(button);
      }
      button.onclick = () => {
        input.dataset.confirmed = '1';
        button.textContent = 'CONFIRMED ✓';
        button.disabled = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
    });
  };

  // React's change handler must not run until the user explicitly confirms the image.
  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (input.dataset.confirmed === '1') {
      delete input.dataset.confirmed;
      return;
    }
    if (input.dataset.confirmBound === '1') event.stopImmediatePropagation();
  }, true);

  const scan = (root = document) => {
    root.querySelectorAll?.('img').forEach(fixImage);
    root.querySelectorAll?.('input[type="file"]').forEach(addConfirm);
    if (root instanceof HTMLImageElement) fixImage(root);
    if (root instanceof HTMLInputElement) addConfirm(root);
  };

  const observer = new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })));
  const start = () => {
    scan();
    observer.observe(document.documentElement, { subtree: true, childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
