(() => {
  const iconSvg = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" class="dot"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M13.2 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.3-1.4 1.5-1.4h1.6V4.8c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.1H8.6V13h2.3v7"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.6-4A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.2-.4.4-.5.7-.5h.5l1 2-.7.8c.6 1 1.3 1.6 2.4 2.1l.7-.7c.2-.2.5-.2.8-.1l1.6.7c.3.1.4.4.3.7-.3 1-1 1.5-2 1.5-2.8-.2-5.9-2.8-6.4-5.3-.2-.7-.1-1 .1-1.2Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a4 4 0 1 1-3-3.9"/><path d="M14 4c.5 2.2 1.8 3.6 4 4"/></svg>'
  };

  const applySocialIcons = () => {
    document.querySelectorAll('footer .socials a').forEach(a => {
      if (a.querySelector('.luxury-social-icon')) return;
      const text = a.textContent || '';
      const key = /instagram/i.test(text) ? 'instagram' : /facebook/i.test(text) ? 'facebook' : /whatsapp/i.test(text) ? 'whatsapp' : /tiktok/i.test(text) ? 'tiktok' : null;
      if (!key) return;
      const label = text.replace(/^[^A-Za-z]+/, '').replace(/\s*↗\s*$/, '').trim();
      a.textContent = '';
      const icon = document.createElement('span');
      icon.className = 'luxury-social-icon';
      icon.innerHTML = iconSvg[key];
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      const arrow = document.createElement('span');
      arrow.className = 'luxury-social-arrow';
      arrow.textContent = '↗';
      a.append(icon, labelEl, arrow);
    });
  };

  const setupHeaderCategories = () => {
    const nav = document.querySelector('.header nav');
    if (!nav || nav.querySelector('.safa-header-categories')) return;
    const old = [...nav.querySelectorAll('a')].find(a => /categories/i.test(a.textContent || ''));
    if (!old) return;
    old.textContent = 'SAFA / CATEGORIES';
    old.classList.add('safa-header-categories');
    old.onclick = e => {
      e.preventDefault();
      let panel = document.querySelector('.safa-category-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'safa-category-panel';
        panel.innerHTML = '<div class="safa-category-panel-inner"><div class="safa-category-panel-head"><div><p class="eyebrow">EXPLORE</p><h2>Curated categories</h2></div><button type="button" class="safa-category-close" aria-label="Close">×</button></div><div class="safa-category-panel-grid"></div></div>';
        document.body.appendChild(panel);
        panel.addEventListener('click', ev => { if (ev.target === panel || ev.target.closest('.safa-category-close')) panel.classList.remove('open'); });
      }
      const grid = panel.querySelector('.safa-category-panel-grid');
      if (!grid.children.length) {
        document.querySelectorAll('.category-photo-grid .cat').forEach(card => {
          const clone = card.cloneNode(true);
          clone.onclick = () => { panel.classList.remove('open'); card.click(); };
          grid.appendChild(clone);
        });
      }
      panel.classList.add('open');
    };
  };

  const cleanFooterCategories = () => {
    const el = document.querySelector('footer .footer-categories');
    if (el) el.remove();
  };

  const run = () => {
    cleanFooterCategories();
    applySocialIcons();
    setupHeaderCategories();
  };
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
