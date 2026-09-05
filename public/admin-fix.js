(() => {
  const ADMIN_EMAIL = 'admin@safa.local';
  const token = () => localStorage.getItem('safaAdminToken');
  const api = (path, options = {}) => fetch(path, { ...options, headers: { ...(options.headers || {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}) } });

  function showError(form, message) {
    let el = form.querySelector('[data-admin-fix-error]');
    if (!el) { el = document.createElement('p'); el.dataset.adminFixError = '1'; el.className = 'error'; form.appendChild(el); }
    el.textContent = message;
  }

  function wireLogin(form) {
    if (form.dataset.adminFixWired) return;
    form.dataset.adminFixWired = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = form.querySelector('input[type="password"]');
      const button = form.querySelector('button[type="submit"], button.goldbtn');
      const password = input?.value || '';
      if (!password) { input?.focus(); return; }
      if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = 'ENTERING…'; }
      try {
        const response = await api('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.token) throw new Error(data.error || 'Invalid password');
        localStorage.setItem('safaAdminToken', data.token);
        window.location.reload();
      } catch (error) {
        showError(form, error.message || 'Could not sign in');
        if (button) { button.disabled = false; button.textContent = button.dataset.originalText || 'ENTER ↗'; }
        input?.focus();
      }
    }, true);
  }

  async function editProduct(product) {
    const name = window.prompt('Product name', product.name_en || '');
    if (name === null) return;
    const priceRaw = window.prompt('Price (EGP)', product.price ?? '');
    if (priceRaw === null) return;
    const stockRaw = window.prompt('Stock quantity', product.stock ?? '0');
    if (stockRaw === null) return;
    const description = window.prompt('Description', product.description_en || '');
    if (description === null) return;
    const discountType = window.prompt('Discount type: none / percent / fixed', product.discount_type || 'none');
    if (discountType === null) return;
    const discountValueRaw = window.prompt('Discount value', product.discount_value ?? '0');
    if (discountValueRaw === null) return;
    const response = await api(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nameEn: name,
        nameAr: name,
        descriptionEn: description,
        descriptionAr: description,
        price: Number(priceRaw),
        stock: Number(stockRaw),
        discountType: ['none', 'percent', 'fixed'].includes(discountType) ? discountType : 'none',
        discountValue: Number(discountValueRaw || 0)
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Product update failed');
    }
    window.location.reload();
  }

  function wireProductEditors() {
    document.querySelectorAll('.producttable .tablerow').forEach(async (row) => {
      if (row.dataset.adminEditWired || !row.querySelector('b')) return;
      row.dataset.adminEditWired = '1';
      const name = row.querySelector('b')?.textContent?.trim();
      if (!name || name === 'No products yet.') return;
      const response = await api('/api/admin/products');
      if (!response.ok) return;
      const products = await response.json().catch(() => []);
      const product = products.find(p => p.name_en === name);
      if (!product) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'edit-admin-product';
      button.textContent = 'EDIT';
      button.style.marginInlineStart = '12px';
      button.addEventListener('click', async () => {
        try { await editProduct(product); } catch (error) { window.alert(error.message || 'Product update failed'); }
      });
      row.appendChild(button);
    });
  }

  function boot() {
    document.querySelectorAll('.loginadmin form').forEach(wireLogin);
    if (token()) wireProductEditors();
  }
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
  boot();
})();
