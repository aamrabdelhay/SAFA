(() => {
  // Rewrites raw Vercel Blob URLs (including private-store URLs, which are
  // not publicly readable) into the same-origin /api/blob proxy so uploaded
  // images keep displaying after a refresh.
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
    return path ? `/api/blob/${encodeURIComponent(path)}` : src;
  };
  const fixImage = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src');
    if (!src) return;
    const proxy = toProxy(src);
    if (proxy && proxy !== src) img.src = proxy;
  };

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
