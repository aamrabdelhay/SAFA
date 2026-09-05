(() => {
  const DEFAULT_CATEGORIES = ['Skincare', 'Face Care', 'Hair Care', 'Body Care', 'Lip Care'];
  const authHeaders = () => {
    const token = localStorage.getItem('safaAdminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const placeholder = label => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ddd3c3"/><stop offset="1" stop-color="#756654"/></linearGradient></defs><rect width="1000" height="700" fill="url(#g)"/><rect x="55" y="55" width="890" height="590" fill="#211f1b" opacity=".12"/><text x="500" y="365" text-anchor="middle" fill="#fffdf8" font-family="Georgia,serif" font-size="58">${label}</text></svg>`)}`;

  function currentCards() {
    return [...document.querySelectorAll('.category-photo-grid .cat')];
  }

  function stabilizeCategoryImages() {
    currentCards().forEach(card => {
      const bg = card.style.backgroundImage || '';
      if (bg.includes('images.unsplash.com')) {
        const title = card.querySelector('h3')?.textContent?.trim() || 'SAFA';
        card.style.backgroundImage = `linear-gradient(180deg,transparent 35%,#211f1bcc 100%),url(${placeholder(title)})`;
      }
    });
  }

  function ensureCategoryPageDefaults() {
    const grid = document.querySelector('.category-page');
    if (!grid || grid.children.length) return;
    DEFAULT_CATEGORIES.forEach((name, index) => {
      const card = document.createElement('div');
      card.className = `cat c${index}`;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.style.backgroundImage = `linear-gradient(180deg,transparent 35%,#211f1bcc 100%),url(${placeholder(name)})`;
      card.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><h3>${name}</h3><small>Explore collection</small><b>↗</b>`;
      const openCategory = () => {
        const productsLink = [...document.querySelectorAll('.header nav a')].find(a => a.textContent.trim().toLowerCase() === 'products');
        if (!productsLink) return;
        productsLink.click();
        let tries = 0;
        const timer = setInterval(() => {
          tries += 1;
          const filter = [...document.querySelectorAll('.filters button')].find(b => b.textContent.trim().toLowerCase() === name.toLowerCase());
          if (filter) { clearInterval(timer); filter.click(); }
          if (tries > 20) clearInterval(timer);
        }, 80);
      };
      card.addEventListener('click', openCategory);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(); } });
      grid.appendChild(card);
    });
  }

  async function categoryApi(path, options = {}) {
    return fetch(path, { ...options, headers: { ...(options.headers || {}), ...authHeaders() } });
  }

  function categoryEditorMarkup(category = null) {
    const isEdit = !!category;
    return `
      <form id="safa-category-form" class="panel" style="max-width:760px">
        <p class="eyebrow">CATEGORY MANAGEMENT</p>
        <h2>${isEdit ? 'Edit category' : 'Add category'}</h2>
        <label>Name (English)<input required name="nameEn" value="${escapeHtml(category?.name_en || '')}" /></label>
        <label>Name (Arabic)<input required name="nameAr" value="${escapeHtml(category?.name_ar || '')}" /></label>
        <label>Image URL (optional)<input name="imageUrl" value="${escapeHtml(category?.image_url || category?.category_image_url || '')}" placeholder="https://..." /></label>
        <label>Position<input type="number" min="0" name="position" value="${Number(category?.position || 0)}" /></label>
        <label class="checkline"><input type="checkbox" name="active" ${category?.active !== false ? 'checked' : ''}/> Active (visible on the site)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="goldbtn" type="submit">${isEdit ? 'SAVE CHANGES ↗' : 'ADD CATEGORY ↗'}</button>
          ${isEdit ? '<button type="button" id="safa-category-cancel">CANCEL</button>' : ''}
        </div>
        <p id="safa-category-error" class="error"></p>
      </form>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  async function renderCategoriesAdmin(container) {
    container.innerHTML = `<div class="admin-title"><h1>Categories</h1><button class="goldbtn" id="safa-add-category">＋ ADD CATEGORY</button></div><div id="safa-category-editor"></div><div id="safa-category-list" class="category-admin-list"></div>`;
    const editor = container.querySelector('#safa-category-editor');
    const list = container.querySelector('#safa-category-list');
    let categories = [];

    const refresh = async () => {
      const r = await categoryApi('/api/admin/categories');
      if (!r.ok) throw new Error('Categories unavailable');
      categories = await r.json();
      list.innerHTML = categories.length ? categories.map(c => `
        <div class="panel" style="margin-top:14px;max-width:900px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
          <div><p class="eyebrow">${escapeHtml(c.name_en || '')}</p><h3 style="margin:0">${escapeHtml(c.name_ar || '')}</h3><small>${c.active === false ? 'Hidden' : 'Active'}</small></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-edit="${c.id}">EDIT</button><button type="button" data-delete="${c.id}">DELETE</button></div>
        </div>`).join('') : '<div class="panel"><p>No categories yet.</p></div>';
      list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
        const category = categories.find(c => String(c.id) === String(btn.dataset.edit));
        editor.innerHTML = categoryEditorMarkup(category);
        bindEditor(category);
      }));
      list.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Delete this category? Its products will become Uncategorized.')) return;
        const r = await categoryApi('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: btn.dataset.delete }) });
        if (!r.ok) { alert((await r.json().catch(() => ({}))).error || 'Category could not be deleted'); return; }
        await refresh();
      }));
    };

    const bindEditor = (category = null) => {
      const form = editor.querySelector('#safa-category-form');
      if (!form) return;
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          ...(category ? { id: category.id } : {}),
          nameEn: String(fd.get('nameEn') || '').trim(),
          nameAr: String(fd.get('nameAr') || '').trim(),
          imageUrl: String(fd.get('imageUrl') || '').trim(),
          position: Number(fd.get('position') || 0),
          active: fd.get('active') === 'on',
        };
        const r = await categoryApi('/api/admin/categories', { method: category ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) { editor.querySelector('#safa-category-error').textContent = (await r.json().catch(() => ({}))).error || 'Category could not be saved'; return; }
        editor.innerHTML = '';
        await refresh();
      });
      form.querySelector('#safa-category-cancel')?.addEventListener('click', () => { editor.innerHTML = ''; });
    };

    container.querySelector('#safa-add-category').addEventListener('click', () => {
      editor.innerHTML = categoryEditorMarkup();
      bindEditor();
    });

    try { await refresh(); } catch (e) { list.innerHTML = `<div class="error panel">${escapeHtml(e.message)}</div>`; }
  }

  function wireAdminCategories() {
    const nav = document.querySelector('.adminnav');
    if (!nav || nav.querySelector('[data-safa-categories-tab]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Categories';
    button.dataset.safaCategoriesTab = 'true';
    nav.appendChild(button);

    const admin = nav.closest('.admin');
    if (!admin) return;
    const custom = document.createElement('section');
    custom.className = 'safa-categories-admin';
    custom.style.display = 'none';
    nav.after(custom);

    const reactViews = () => [...admin.children].filter(el => el !== nav && el !== custom);
    const showReact = () => reactViews().forEach(el => { el.style.display = ''; });
    const showCustom = async () => {
      reactViews().forEach(el => { el.style.display = 'none'; });
      custom.style.display = '';
      button.classList.add('active');
      await renderCategoriesAdmin(custom);
    };
    const bindRestore = () => {
      nav.querySelectorAll('button:not([data-safa-categories-tab])').forEach(existing => {
        if (existing.dataset.safaRestoreBound) return;
        existing.dataset.safaRestoreBound = 'true';
        existing.addEventListener('click', () => { custom.style.display = 'none'; button.classList.remove('active'); showReact(); });
      });
    };
    button.addEventListener('click', showCustom);
    bindRestore();
  }

  function cleanupLogoUpload() {
    document.querySelectorAll('.add-logo').forEach(el => el.remove());
  }

  const observer = new MutationObserver(() => {
    stabilizeCategoryImages();
    ensureCategoryPageDefaults();
    wireAdminCategories();
    cleanupLogoUpload();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  stabilizeCategoryImages();
  ensureCategoryPageDefaults();
  wireAdminCategories();
  cleanupLogoUpload();
})();
