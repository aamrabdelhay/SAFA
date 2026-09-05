(() => {
  const token = () => localStorage.getItem('safaAdminToken') || '';
  const api = (path, options = {}) => fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {})
    }
  });

  let categoriesCache = null;
  let wiring = false;

  const esc = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  async function categories() {
    if (categoriesCache) return categoriesCache;
    const r = await api('/api/admin/categories');
    if (!r.ok) throw new Error('Categories could not be loaded');
    categoriesCache = await r.json();
    return categoriesCache;
  }

  function closeModal() {
    document.querySelectorAll('.safa-safe-product-modal').forEach((el) => el.remove());
  }

  async function openAddProduct() {
    if (document.querySelector('.safa-safe-product-modal')) return;
    const root = document.createElement('div');
    root.className = 'modal safa-safe-product-modal';
    root.style.cssText = 'position:fixed;inset:0;background:#211f1b88;z-index:2147483000;display:grid;place-items:center;padding:20px;overflow:auto;';
    root.innerHTML = `<div class="productform productform-large" style="background:#faf8f2;color:#211f1b;position:relative;max-width:760px;width:100%;max-height:90vh;overflow:auto;padding:34px;box-shadow:0 25px 80px #211f1b33">
      <button type="button" class="close safa-safe-close" aria-label="Close">×</button>
      <p class="eyebrow">PRODUCT MANAGEMENT</p>
      <h2>Add product</h2>
      <form class="safa-safe-product-form">
        <label>Product image<input name="image" type="file" accept="image/*"/></label>
        <label>Product name<input name="nameEn" required /></label>
        <label>Description<textarea name="descriptionEn"></textarea></label>
        <div class="formgrid"><label>Price (EGP)<input name="price" required min="0" step="0.01" type="number" /></label><label>Stock quantity<input name="stock" min="0" step="1" type="number" value="0" /></label></div>
        <label>Category<select name="categoryId"><option value="">Uncategorized</option></select></label>
        <label>Specifications / Options<input name="specifications" placeholder="30ml, 50ml, 100ml" /></label>
        <div class="formgrid"><label>Discount type<select name="discountType"><option value="none">No discount</option><option value="percent">Percentage %</option><option value="fixed">Fixed EGP</option></select></label><label>Discount value<input name="discountValue" min="0" step="0.01" type="number" value="0" /></label></div>
        <div class="formgrid"><label class="checkline"><input name="featured" type="checkbox"/> Featured</label><label class="checkline"><input name="newArrival" type="checkbox"/> New arrival</label></div>
        <p class="error safa-safe-error" style="display:none"></p>
        <button class="goldbtn safa-safe-submit" type="submit">PUBLISH PRODUCT ↗</button>
      </form>
    </div>`;
    document.body.appendChild(root);
    root.querySelector('.safa-safe-close').addEventListener('click', closeModal);
    root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });

    try {
      const list = await categories();
      const select = root.querySelector('[name="categoryId"]');
      list.forEach((c) => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name_en || c.nameEn || 'Category';
        select.appendChild(option);
      });
    } catch (e) {
      root.querySelector('.safa-safe-error').textContent = e.message;
      root.querySelector('.safa-safe-error').style.display = 'block';
    }

    root.querySelector('.safa-safe-product-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('.safa-safe-submit');
      const error = form.querySelector('.safa-safe-error');
      submit.disabled = true;
      submit.textContent = 'SAVING…';
      error.style.display = 'none';
      try {
        const fd = new FormData(form);
        const payload = {
          nameEn: fd.get('nameEn'),
          nameAr: fd.get('nameEn'),
          descriptionEn: fd.get('descriptionEn') || '',
          descriptionAr: fd.get('descriptionEn') || '',
          price: Number(fd.get('price') || 0),
          stock: Number(fd.get('stock') || 0),
          categoryId: fd.get('categoryId') || null,
          discountType: fd.get('discountType') || 'none',
          discountValue: Number(fd.get('discountValue') || 0),
          featured: fd.get('featured') === 'on',
          newArrival: fd.get('newArrival') === 'on',
          active: true,
          tags: [],
          specifications: String(fd.get('specifications') || '').split(',').map(x => x.trim()).filter(Boolean)
        };
        const response = await api('/api/admin/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.id) throw new Error(data.error || 'Product could not be saved');
        const image = form.querySelector('[name="image"]').files?.[0];
        if (image) {
          const imageData = new FormData();
          imageData.append('file', image);
          const imageResponse = await api(`/api/admin/products/${data.id}/images`, { method: 'POST', body: imageData });
          const imageResult = await imageResponse.json().catch(() => ({}));
          if (!imageResponse.ok) throw new Error(imageResult.error || 'Image upload failed');
        }
        closeModal();
        window.location.reload();
      } catch (e) {
        error.textContent = e.message || 'Product could not be saved';
        error.style.display = 'block';
        submit.disabled = false;
        submit.textContent = 'PUBLISH PRODUCT ↗';
      }
    });
  }

  function wire() {
    if (wiring) return;
    wiring = true;
    const buttons = Array.from(document.querySelectorAll('.admin .admin-title .goldbtn, .admin .orderhead .goldbtn'));
    buttons.forEach((button) => {
      if (button.dataset.safaSafeProduct === '1') return;
      if (!/ADD PRODUCT/i.test(button.textContent || '')) return;
      button.dataset.safaSafeProduct = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAddProduct();
      }, true);
    });
    wiring = false;
  }

  const observer = new MutationObserver(wire);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  wire();
})();
