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
    if (!(img instanceof HTMLImageElement)) return;
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
    if (!file || !file.type.startsWith('image/')) return false;
    const img = document.createElement('img');
    img.alt = 'Selected image preview';
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    box.appendChild(img);
    return true;
  };

  const confirmButton = (input) => {
    let button = input.parentElement?.querySelector('.safa-confirm-upload');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'safa-confirm-upload';
      button.addEventListener('click', () => {
        const file = input.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        input.dataset.safaConfirmed = '1';
        button.textContent = 'CONFIRMED ✓';
        button.disabled = true;
        // Re-dispatch a real bubbled change so the existing React handler
        // receives the file only after the user explicitly confirms it.
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      input.parentElement?.appendChild(button);
    }
    button.textContent = /logo/i.test(input.parentElement?.textContent || '')
      ? 'CONFIRM & SAVE LOGO'
      : 'CONFIRM IMAGE';
    button.disabled = false;
    return button;
  };

  const handleFileSelection = (input) => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return false;
    const file = input.files?.[0];
    const previewed = showPreview(input, file);
    const button = input.parentElement?.querySelector('.safa-confirm-upload');
    if (!file || !previewed) {
      if (button) button.remove();
      delete input.dataset.safaConfirmed;
      return false;
    }
    confirmButton(input);
    return true;
  };

  // Intercept native file changes before React. The file is previewed immediately,
  // but React's upload/save handler is allowed to run only after explicit confirmation.
  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (input.dataset.safaConfirmed === '1') {
      delete input.dataset.safaConfirmed;
      return;
    }
    if (handleFileSelection(input)) event.stopImmediatePropagation();
  }, true);

  const scan = (root = document) => {
    root.querySelectorAll?.('img').forEach(fixImage);
  };

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) scan(n);
    }));
  });

  const start = () => {
    scan();
    observer.observe(document.documentElement, { subtree: true, childList: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
