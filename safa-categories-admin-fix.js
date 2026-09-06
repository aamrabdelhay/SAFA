(() => {
  const endpoints = ['/api/admin/categories', '/api/admin-categories'];
  const token = () => localStorage.getItem('safaAdminToken') || '';
  const headers = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });
  const request = async (method, body) => {
    let lastError = 'Category operation failed';
    for (const endpoint of endpoints) {
      try {
        const r = await fetch(endpoint, { method, headers: headers(), ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) });
        const x = await r.json().catch(() => ({}));
        if (r.ok) return x;
        lastError = x.error || lastError;
        if (r.status !== 404 && r.status !== 405) break;
      } catch (e) { lastError = e.message || lastError; }
    }
    throw Error(lastError);
  };
  const get = () => request('GET');
  const save = (method, body) => request(method, body);
  const css = () => {
    if (document.getElementById('safa-category-admin-css')) return;
    const s = document.createElement('style'); s.id = 'safa-category-admin-css';
    s.textContent = `.safa-cat-modal{position:fixed;inset:0;z-index:99999;background:rgba(16,28,44,.55);display:flex;align-items:center;justify-content:center;padding:20px}.safa-cat-panel{background:#faf8f2;color:#211f1b;max-width:920px;width:100%;max-height:90vh;overflow:auto;padding:32px;border:1px solid rgba(184,134,11,.28);box-shadow:0 25px 80px rgba(33,31,27,.22)}.safa-cat-panel h2{font:500 38px/1 'Cormorant Garamond',serif;margin:7px 0 0}.safa-cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}.safa-cat-grid label{display:flex;flex-direction:column;gap:7px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6f6a60}.safa-cat-grid input,.safa-cat-grid textarea,.safa-cat-grid select{padding:12px;border:0;border-bottom:1px solid rgba(33,31,27,.22);border-radius:0;background:#fffdf8;color:#211f1b;outline:none;font:inherit}.safa-cat-grid input:focus,.safa-cat-grid textarea:focus,.safa-cat-grid select:focus{border-bottom-color:#b8860b;box-shadow:0 2px 0 rgba(184,134,11,.12)}.safa-cat-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px}.safa-cat-actions button,.safa-cat-row button{border:1px solid rgba(33,31,27,.18);background:#fffdf8;color:#211f1b;padding:10px 14px;cursor:pointer}.safa-cat-actions button[type=submit]{background:#211f1b;color:#fff;border-color:#211f1b;letter-spacing:.08em}.safa-cat-actions button[type=submit]:hover{background:#b8860b;border-color:#b8860b}.safa-cat-list{margin-top:28px;border-top:1px solid rgba(33,31,27,.1)}.safa-cat-row{display:grid;grid-template-columns:minmax(0,1fr) 90px 80px 80px;gap:10px;align-items:center;padding:15px 0;border-bottom:1px solid rgba(33,31,27,.08)}.safa-cat-row button:hover{border-color:#b8860b;color:#8b6a24}.safa-cat-error{color:#9b1c1c;margin-top:12px;font-size:12px}@media(max-width:700px){.safa-cat-panel{padding:22px 18px}.safa-cat-grid{grid-template-columns:1fr}.safa-cat-row{grid-template-columns:1fr 65px 65px 65px;font-size:11px}.safa-cat-actions{display:grid;grid-template-columns:1fr 1fr}.safa-cat-actions button[type=submit]{grid-column:1/-1}}`;
    document.head.appendChild(s);
  };
  const open = async () => {
    css();
    const modal = document.createElement('div'); modal.className='safa-cat-modal';
    const panel = document.createElement('div'); panel.className='safa-cat-panel'; modal.appendChild(panel); document.body.appendChild(modal);
    let editing = null;
    const render = async () => {
      const cats = await get();
      panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><small style="letter-spacing:.12em;color:#8b7751">SAFA / CATALOGUE</small><h2>Manage Categories</h2></div><button data-close aria-label="Close" style="border:0;background:transparent;font-size:28px;cursor:pointer">×</button></div><form data-form><div class="safa-cat-grid"><label>English name<input name="nameEn" required></label><label>Arabic name<input name="nameAr" required></label><label>Slug<input name="slug" placeholder="auto-generated"></label><label>Position<input name="position" type="number" value="0"></label><label>Image URL<input name="imageUrl" placeholder="optional"></label><label>Active<select name="active"><option value="true">Active</option><option value="false">Hidden</option></select></label><label style="grid-column:1/-1">English description<textarea name="descriptionEn"></textarea></label><label style="grid-column:1/-1">Arabic description<textarea name="descriptionAr"></textarea></label></div><div class="safa-cat-actions"><button type="button" data-cancel>Clear</button><button type="submit">${editing?'SAVE CHANGES':'ADD CATEGORY'}</button></div><div class="safa-cat-error" data-error></div></form><div class="safa-cat-list">${cats.map(c=>`<div class="safa-cat-row"><div><b>${escapeHtml(c.name_en)}</b><div style="font-size:12px;opacity:.65">${escapeHtml(c.name_ar)} · ${escapeHtml(c.slug)}</div></div><span>${c.active?'Active':'Hidden'}</span><button data-edit="${c.id}">Edit</button><button data-delete="${c.id}">Delete</button></div>`).join('') || '<p>No categories yet.</p>'}</div>`;
      const form = panel.querySelector('[data-form]');
      if (editing) { const c=cats.find(x=>x.id===editing); if(c){ for(const k of ['nameEn','nameAr','slug','position','imageUrl','descriptionEn','descriptionAr']) if(form.elements[k]) form.elements[k].value=c[k==='nameEn'?'name_en':k==='nameAr'?'name_ar':k==='imageUrl'?'image_url':k==='descriptionEn'?'description_en':k==='descriptionAr'?'description_ar':k] ?? ''; form.elements.active.value=String(c.active); } }
      form.onsubmit = async e => { e.preventDefault(); const fd=new FormData(form); const body={nameEn:fd.get('nameEn'),nameAr:fd.get('nameAr'),slug:fd.get('slug'),position:Number(fd.get('position')||0),imageUrl:fd.get('imageUrl'),descriptionEn:fd.get('descriptionEn'),descriptionAr:fd.get('descriptionAr'),active:fd.get('active')==='true'}; try { await save(editing?'PATCH':'POST', editing?{id:editing,...body}:body); editing=null; await render(); } catch(err){ panel.querySelector('[data-error]').textContent=err.message; } };
      panel.querySelector('[data-cancel]').onclick=()=>{editing=null;render()};
      panel.querySelector('[data-close]').onclick=()=>modal.remove();
      panel.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;render()});
      panel.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this category? Products will become Uncategorized.'))return;try{await save('DELETE',{id:b.dataset.delete});if(editing===b.dataset.delete)editing=null;await render()}catch(err){panel.querySelector('[data-error]').textContent=err.message}});
    };
    try { await render(); } catch (err) { panel.innerHTML = `<div class="safa-cat-error">${escapeHtml(err.message)}</div><button data-close>Close</button>`; panel.querySelector('[data-close]').onclick=()=>modal.remove(); }
  };
  const escapeHtml = value => String(value??'').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const inject = () => { if(!localStorage.getItem('safaAdminToken')) return; const nav=document.querySelector('.adminnav'); if(!nav||nav.querySelector('[data-safa-categories]')) return; const b=document.createElement('button'); b.textContent='Categories'; b.dataset.safaCategories='1'; b.onclick=open; nav.appendChild(b); };
  new MutationObserver(inject).observe(document.documentElement,{subtree:true,childList:true}); setInterval(inject,1000); inject();
})();
