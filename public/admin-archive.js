(function(){
  const nativeFetch=window.fetch.bind(window);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const jsonResponse=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});

  async function archive(type,id){
    const r=await nativeFetch('/api/admin-archive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'archive',type,id})});
    if(!r.ok){const x=await r.json().catch(()=>({}));throw Error(x.error||'Archive failed')}
    return r;
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method==='DELETE'){
      const pm=url.match(/\/api\/admin\/products\/([^/?#]+)/);
      if(pm){await archive('product',decodeURIComponent(pm[1]));return new Response('',{status:204});}
      const cm=url.match(/\/api\/admin\/categories(?:\/([^/?#]+))?/);
      if(cm){const id=decodeURIComponent(cm[1]||new URL(url,location.origin).searchParams.get('id')||'');if(id){await archive('category',id);return new Response('',{status:204});}}
    }
    if(method==='GET'&&url.includes('/api/admin/orders')){
      const r=await nativeFetch(input,init);
      if(!r.ok)return r;
      const data=await r.json().catch(()=>[]);
      window.__safaOrders=Array.isArray(data)?data:[];
      return jsonResponse(Array.isArray(data)?data.filter(x=>!x.archived_at):data);
    }
    if(method==='GET'&&url.includes('/api/admin/categories')){
      const r=await nativeFetch(input,init);
      if(!r.ok)return r;
      const data=await r.json().catch(()=>[]);
      return jsonResponse(Array.isArray(data)?data.filter(x=>x.active!==false):data);
    }
    if(method==='GET'&&url.includes('/api/admin/stats')){
      const [sr,or]=await Promise.all([nativeFetch(input,init),nativeFetch('/api/admin/orders',{credentials:'same-origin'})]);
      if(!sr.ok)return sr;
      const stats=await sr.json().catch(()=>({}));
      const orders=await or.json().catch(()=>[]);
      if(Array.isArray(orders)){
        stats.orders=orders.filter(x=>!x.archived_at).length;
        stats.revenue=orders.filter(x=>!x.archived_at&&x.status!=='cancelled').reduce((sum,x)=>sum+Number(x.total||0),0).toFixed(2);
      }
      return jsonResponse(stats);
    }
    return nativeFetch(input,init);
  };

  async function loadArchive(){
    const panel=document.querySelector('.archive-panel');
    if(!panel)return;
    const content=panel.querySelector('.archive-content');
    if(content)content.innerHTML='<p class="archive-empty">Loading archive…</p>';
    try{
      const r=await nativeFetch('/api/admin-archive?type=all',{credentials:'same-origin'});
      const data=await r.json();
      if(!r.ok)throw Error(data.error||'Archive unavailable');
      const render=(items,type,label)=>`
        <section class="archive-section"><h3>${label}</h3>${items.length?items.map(x=>{
          const title=type==='order'?`#${esc(x.order_number)}`:esc(x.name_en);
          const meta=type==='order'?`${esc(x.customer_name)} · ${esc(x.status)}`:(type==='product'?`${esc(x.category_en||'Uncategorized')} · ${esc(x.stock)} in stock`:`${esc(x.slug||'')}`);
          return `<div class="archive-item"><div class="archive-meta"><strong>${title}</strong><small>${meta}</small></div><button class="archive-restore" data-restore-type="${type}" data-restore-id="${esc(x.id)}">RESTORE</button></div>`;
        }).join(''):'<p class="archive-empty">Archive is empty.</p>'}</section>`;
      content.innerHTML=`<div class="archive-columns">${render(data.orders||[],'order','Orders')}${render(data.products||[],'product','Products')}${render(data.categories||[],'category','Categories')}</div>`;
    }catch(e){content.innerHTML=`<p class="error">${esc(e.message)}</p>`}
  }

  function ensureArchiveUI(){
    const nav=document.querySelector('.adminnav');
    const root=document.querySelector('.admin-clean');
    if(!nav||!root)return;
    let btn=nav.querySelector('[data-safa-archive-nav]');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.textContent='Archive';
      btn.className='archive-nav-button';
      btn.dataset.safaArchiveNav='1';
      nav.appendChild(btn);
      btn.addEventListener('click',()=>{root.classList.add('archive-open');ensurePanel();loadArchive();});
    }
    nav.querySelectorAll('button:not([data-safa-archive-nav])').forEach(x=>{
      if(x.dataset.safaArchiveBound==='1')return;
      x.dataset.safaArchiveBound='1';
      x.addEventListener('click',()=>root.classList.remove('archive-open'));
    });
    root.querySelectorAll('.delete-btn').forEach(x=>{if(!x.dataset.safaArchiveLabel){x.dataset.safaArchiveLabel='1';x.textContent='ARCHIVE';x.title='Move to archive';}});
    document.querySelectorAll('.order-card').forEach(card=>{
      if(card.querySelector('.order-archive-button'))return;
      const orderNumber=(card.querySelector('.order-card-head b')?.textContent||'').replace(/^#/,'').trim();
      const order=Array.isArray(window.__safaOrders)?window.__safaOrders.find(x=>String(x.order_number)===orderNumber):null;
      if(!order?.id)return;
      const button=document.createElement('button');
      button.type='button';button.className='order-archive-button';button.textContent='ARCHIVE';
      button.addEventListener('click',async()=>{if(!confirm('Move this order to the archive?'))return;try{await archive('order',order.id);card.remove();window.__safaOrders=(window.__safaOrders||[]).filter(x=>x.id!==order.id)}catch(e){alert(e.message)}});
      card.querySelector('.order-card-head')?.appendChild(button);
    });
  }

  function ensurePanel(){
    const root=document.querySelector('.admin-clean');
    if(!root||!root.querySelector('.adminnav'))return null;
    let panel=root.querySelector('.archive-panel');
    if(panel)return panel;
    panel=document.createElement('section');
    panel.className='archive-panel';
    panel.innerHTML='<div class="archive-toolbar"><div><p class="eyebrow">SAFA / RECOVERY</p><h2>Archive</h2></div><button type="button" class="archive-refresh">REFRESH</button></div><div class="archive-content"></div>';
    panel.querySelector('.archive-refresh').addEventListener('click',loadArchive);
    root.appendChild(panel);
    panel.addEventListener('click',async e=>{
      const b=e.target.closest('[data-restore-type]');
      if(!b)return;
      b.disabled=true;
      try{
        const r=await nativeFetch('/api/admin-archive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',type:b.dataset.restoreType,id:b.dataset.restoreId})});
        const x=await r.json().catch(()=>({}));
        if(!r.ok)throw Error(x.error||'Restore failed');
        await loadArchive();
      }catch(err){alert(err.message);b.disabled=false}
    });
    return panel;
  }

  const observer=new MutationObserver(()=>{ensureArchiveUI();if(document.querySelector('.adminnav'))ensurePanel()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureArchiveUI();ensurePanel()},{once:true});
  else{ensureArchiveUI();ensurePanel()}
})();
