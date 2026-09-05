(function () {
  const categoryFallbacks = {
    'Skincare':'https://images.unsplash.com/photo-1556229010-9f7e3f2f9d5a?auto=format&fit=crop&w=900&q=85',
    'Face Care':'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85',
    'Hair Care':'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85',
    'Body Care':'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85',
    'Lip Care':'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85'
  };
  const normalize=s=>String(s||'').trim().toLowerCase();
  function patchCategories(){
    const heading=Array.from(document.querySelectorAll('h1')).find(x=>normalize(x.textContent)==='categories');
    if(!heading)return;
    const main=heading.closest('main'),grid=main&&main.querySelector('.category-page');
    if(!grid||grid.dataset.safaPatched==='1')return;
    grid.dataset.safaPatched='1';grid.classList.add('category-photo-grid','safa-category-page');
    Array.from(grid.children).forEach((card,i)=>{
      const title=card.querySelector('h3')?.textContent?.trim()||'';
      const key=Object.keys(categoryFallbacks).find(k=>normalize(k)===normalize(title));if(!key)return;
      const count=card.querySelector('small')?.textContent||'';
      card.classList.add('cat','c'+i);
      card.style.backgroundImage=`linear-gradient(180deg,transparent 35%,#211f1bcc 100%),url("${categoryFallbacks[key]}")`;
      card.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><h3>${title}</h3><small>${count}</small><b>↗</b>`;
    });
  }
  function patchHeader(){document.querySelectorAll('.header nav a').forEach(a=>{if(normalize(a.textContent).includes('safa / categories'))a.textContent='CATEGORIES';});}
  function installConfirm(){if(window.__safaConfirmInstalled)return;window.__safaConfirmInstalled=true;document.addEventListener('submit',e=>{const form=e.target;if(!form.closest('.productform-large'))return;const button=form.querySelector('button.goldbtn');if(button&&/SAVE PRODUCT/i.test(button.textContent||'')&&!window.confirm('Confirm publishing this product to the SAFA homepage?')){e.preventDefault();e.stopImmediatePropagation();}},true);}
  function installRefresh(){if(window.__safaFetchPatched)return;window.__safaFetchPatched=true;const original=window.fetch;window.fetch=async function(input,init){const response=await original.apply(this,arguments);try{const url=typeof input==='string'?input:(input&&input.url)||'';const method=(init&&init.method)||(input&&input.method)||'GET';if(method.toUpperCase()==='POST'&&/\/api\/admin\/products\/[^/]+\/images$/.test(url)&&response.ok)setTimeout(()=>window.location.reload(),700);else if(method.toUpperCase()==='POST'&&/\/api\/admin\/products$/.test(url)&&response.ok){const form=document.querySelector('.productform-large');const file=form?.querySelector('input[type="file"]');if(!file?.files?.length)setTimeout(()=>window.location.reload(),700);}}catch{}return response;};}
  function run(){patchHeader();patchCategories();installConfirm();installRefresh();}
  run();new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
})();
