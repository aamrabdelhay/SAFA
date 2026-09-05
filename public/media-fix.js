(() => {
  const isBlobUrl = (src) => {
    try { return /\.blob\.vercel-storage\.com$/i.test(new URL(src, location.href).hostname); } catch { return false; }
  };
  const toProxy = (src) => {
    try {
      const u = new URL(src, location.href);
      if (!isBlobUrl(src)) return src;
      return `/api/blob?path=${encodeURIComponent(u.pathname.replace(/^\//, ''))}`;
    } catch { return src; }
  };
  const fixImage = (img) => {
    if (!(img instanceof HTMLImageElement) || img.dataset.blobFixed === '1') return;
    const src = img.getAttribute('src');
    if (!src || !isBlobUrl(src)) return;
    const proxy = toProxy(src);
    if (proxy !== src) {
      img.dataset.blobFixed = '1';
      img.src = proxy;
    }
  };
  const attachPreview = (input) => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || input.dataset.previewBound === '1') return;
    input.dataset.previewBound = '1';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      let box = input.parentElement?.querySelector('.safa-upload-preview');
      if (!box) {
        box = document.createElement('div');
        box.className = 'safa-upload-preview';
        input.parentElement?.appendChild(box);
      }
      box.replaceChildren();
      if (!file || !file.type.startsWith('image/')) return;
      const img = document.createElement('img');
      img.alt = 'Selected image preview';
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      box.appendChild(img);
    });
  };
  const scan = (root = document) => {
    root.querySelectorAll?.('img').forEach(fixImage);
    root.querySelectorAll?.('input[type="file"]').forEach(attachPreview);
    if (root instanceof HTMLImageElement) fixImage(root);
    if (root instanceof HTMLInputElement) attachPreview(root);
  };
  const observer = new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })));
  const start = () => { scan(); observer.observe(document.documentElement, {subtree:true, childList:true}); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
