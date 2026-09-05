(() => {
  const token = () => localStorage.getItem('safaAdminToken');
  const api = (path, options = {}) => fetch(path, { ...options, headers: { ...(options.headers || {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}) } });
  let passwordlessLoginInProgress = false;

  async function passwordlessAdminLogin() {
    if (token()) return true;
    if (passwordlessLoginInProgress) return false;
    passwordlessLoginInProgress = true;
    try {
      const response = await fetch('/api/admin/guest-token', { method: 'POST', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.error || 'Admin access unavailable');
      localStorage.setItem('safaAdminToken', data.token);
      return true;
    } catch {
      passwordlessLoginInProgress = false;
      return false;
    }
  }

  function loginUI(root) {
    if (!root || token()) return;
    if (root.dataset.adminLoginUi === '1') return;
    root.dataset.adminLoginUi = '1';
    // Never show the old password/login screen. The key opens the admin panel
    // directly and this element stays invisible only while the session is made.
    root.style.display = 'none';
    passwordlessAdminLogin().then(ok => {
      if (ok) {
        window.location.reload();
        return;
      }
      // Retry silently; do not expose an authentication screen to the admin.
      root.dataset.adminLoginUi = '0';
      setTimeout(() => loginUI(root), 250);
    });
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
