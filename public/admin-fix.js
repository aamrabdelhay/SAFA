(() => {
  const ADMIN_EMAIL = 'admin@safa.local';
  const token = () => localStorage.getItem('safaAdminToken');
  const api = (path, options = {}) => fetch(path, { ...options, headers: { ...(options.headers || {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}) } });

  function loginUI(root) {
    if (!root || root.dataset.adminLoginUi === '1' || token()) return;
    root.dataset.adminLoginUi = '1';
    const box = root.querySelector('.productform') || root;
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'safa-admin-login-ui';
    wrap.innerHTML = '<p class="eyebrow">ADMIN ACCESS</p><h2>ADMIN ACCESS</h2><label class="safa-admin-password-label">PASSWORD<input class="safa-admin-password" type="password" autocomplete="current-password" placeholder="Enter password" /></label><button type="button" class="goldbtn safa-admin-login-button">ENTER ↗</button><p class="safa-admin-error" aria-live="polite"></p>';
    box.appendChild(wrap);
    const input = wrap.querySelector('.safa-admin-password');
    const button = wrap.querySelector('.safa-admin-login-button');
    const error = wrap.querySelector('.safa-admin-error');
    const submit = async () => {
      const password = input.value.trim();
      if (!password) { input.focus(); return; }
      button.disabled = true;
      button.textContent = 'ENTERING…';
      error.textContent = '';
      try {
        const response = await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.token) throw new Error(data.error || 'Invalid password');
        localStorage.setItem('safaAdminToken', data.token);
        window.location.reload();
      } catch (e) {
        error.textContent = e.message || 'Invalid password';
        button.disabled = false;
        button.textContent = 'ENTER ↗';
        input.focus();
      }
    };
    button.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    setTimeout(() => input.focus(), 50);
  }

  function showError(form, message) {
    let el = form.querySelector('[data-admin-fix-error]');
    if (!el) { el = document.createElement('p'); el.dataset.adminFixError = '1'; el.className = 'error'; form.appendChild(el); }
    el.textContent = message;
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
    const response = await api(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nameEn: name, nameAr: name, descriptionEn: description, descriptionAr: description, price: Number(priceRaw), stock: Number(stockRaw), discountType: ['none', 'percent', 'fixed'].includes(discountType) ? discountType : 'none', discountValue: Number(discountValueRaw || 0) }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Product update failed'); }
    window.location.reload();
  }

  function wireProductEditors() {
    document.querySelectorAll('.producttable .tablerow').forEach(async row => {
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
      button.type = 'button'; button.className = 'edit-admin-product'; button.textContent = 'EDIT'; button.style.marginInlineStart = '12px';
      button.addEventListener('click', async () => { try { await editProduct(product); } catch (e) { window.alert(e.message || 'Product update failed'); } });
      row.appendChild(button);
    });
  }

  function openAdminFromDirectLink() {
    const params = new URLSearchParams(window.location.search);
    const wantsAdmin = params.get('admin') === '1' || window.location.hash === '#admin';
    if (!wantsAdmin || token()) return;
    const key = document.querySelector('.keybutton');
    if (key) { key.click(); window.history.replaceState({}, document.title, window.location.pathname); }
  }

  function boot() {
    openAdminFromDirectLink();
    document.querySelectorAll('.loginadmin').forEach(loginUI);
    if (token()) wireProductEditors();
  }
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
  boot();
})();