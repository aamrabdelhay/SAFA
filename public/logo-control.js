(function () {
  const DEFAULTS = { logo: '', x: 0, y: 0, size: 420, animation: 'fade', duration: 900 };

  const getConfig = async () => {
    try {
      const response = await fetch('/api/logo-config', { credentials: 'same-origin', cache: 'no-store' });
      return response.ok ? response.json() : null;
    } catch {
      return null;
    }
  };

  const saveConfig = async (config) => {
    const response = await fetch('/api/logo-config', {
      method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || 'Save failed');
    return data;
  };

  const animationName = (value) => ({ 'slide-up': 'lc-slide', zoom: 'lc-zoom', float: 'lc-float', fade: 'lc-fade', none: 'none' }[value] || 'lc-fade');

  const style = document.createElement('style');
  style.textContent = `
    .logo-control-button{border:1px solid #cbbd9f;background:#fff;color:#211f1b;padding:10px 15px;border-radius:9px;font:600 13px Arial,sans-serif;cursor:pointer;box-shadow:0 4px 14px #0000000d}
    .logo-control-button:hover{background:#f8f5ed}
    .adminnav .logo-control-button{margin:0}
    .logo-control-modal{position:fixed;inset:0;z-index:100000;background:#0008;display:grid;place-items:center;padding:20px}
    .logo-control-card{width:min(560px,96vw);max-height:92vh;overflow:auto;background:#f8f5ed;color:#211f1b;border-radius:18px;padding:24px;box-shadow:0 24px 80px #0005;font-family:Arial,sans-serif}
    .logo-control-card h2{margin:0 0 6px;font:600 28px Georgia,serif}.logo-control-card .muted{color:#716b61;font-size:13px;margin:0 0 20px}
    .lc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.lc-field{display:flex;flex-direction:column;gap:7px}.lc-field.full{grid-column:1/-1}.lc-field label{font-size:12px;font-weight:700}
    .lc-field input,.lc-field select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d6cdbb;border-radius:9px;background:#fff}.lc-field input[type=range]{padding:0}
    .lc-preview{height:210px;border:1px solid #ddd2bd;border-radius:14px;background:linear-gradient(135deg,#f7f3e9,#eee6d6);display:grid;place-items:center;overflow:hidden;margin:18px 0}.lc-preview img{max-width:90%;max-height:90%;object-fit:contain;width:var(--size);transform:translate(var(--x),var(--y));animation:var(--anim) var(--duration) ease both}
    .lc-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}.lc-actions button{border:1px solid #cbbd9f;background:#fff;padding:10px 15px;border-radius:9px;cursor:pointer}.lc-actions .primary{background:#b8860b;color:#fff;border-color:#b8860b}.lc-status{min-height:18px;font-size:12px;color:#7a6a45;margin-top:8px}
    @keyframes lc-fade{from{opacity:0}to{opacity:1}}@keyframes lc-slide{from{opacity:0;transform:translate(var(--x),calc(var(--y) + 35px))}to{opacity:1;transform:translate(var(--x),var(--y))}}
    @keyframes lc-zoom{from{opacity:0;transform:translate(var(--x),var(--y)) scale(.72)}to{opacity:1;transform:translate(var(--x),var(--y)) scale(1)}}@keyframes lc-float{from{opacity:0;transform:translate(var(--x),calc(var(--y) + 20px))}50%{opacity:1}to{opacity:1;transform:translate(var(--x),var(--y))}}
    @media (max-width:640px){.lc-grid{grid-template-columns:1fr}.lc-field.full{grid-column:auto}.logo-control-modal{padding:10px}}
  `;
  document.head.appendChild(style);

  async function renderHome(config) {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    let img = hero.querySelector('.hero-logo-control');
    if (!img) { img = document.createElement('img'); img.className = 'hero-logo-control'; img.alt = 'SAFA'; hero.querySelector('.hero-copy')?.prepend(img); }
    let logo = config.logo;
    if (!logo) logo = await fetch('/api/settings/logo',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>x?.logo||'').catch(()=> '');
    if (!logo) { img.remove(); return; }
    img.src = logo;
    img.style.cssText = [`--x:${Number(config.x)||0}%`,`--y:${Number(config.y)||0}%`,`--size:${Math.min(700,Math.max(120,Number(config.size)||420))}px`,`--duration:${Math.min(2500,Math.max(200,Number(config.duration)||900))}ms`,`--anim:${animationName(config.animation)}`,'width:var(--size)','max-width:80vw','height:auto','object-fit:contain','display:block','margin:0 auto 28px','transform:translate(var(--x),var(--y))','animation:var(--anim) var(--duration) ease both'].join(';');
  }

  function openControls() {
    if (document.querySelector('.logo-control-modal')) return;
    getConfig().then((remote) => {
      const config = { ...DEFAULTS, ...(remote || {}) };
      const modal = document.createElement('div'); modal.className='logo-control-modal';
      modal.innerHTML=`<div class="logo-control-card" role="dialog" aria-modal="true"><h2>Homepage Logo</h2><p class="muted">Change the homepage logo, size, position and entrance animation.</p><div class="lc-grid"><div class="lc-field full"><label>Logo image</label><input id="lc-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></div><div class="lc-field"><label>Horizontal position</label><input id="lc-x" type="range" min="-45" max="45" value="${config.x}"><span id="lc-xv">${config.x}%</span></div><div class="lc-field"><label>Vertical position</label><input id="lc-y" type="range" min="-45" max="45" value="${config.y}"><span id="lc-yv">${config.y}%</span></div><div class="lc-field"><label>Logo size</label><input id="lc-size" type="range" min="120" max="700" value="${config.size}"><span id="lc-sizev">${config.size}px</span></div><div class="lc-field"><label>Entrance animation</label><select id="lc-anim"><option value="none">None</option><option value="fade">Fade in</option><option value="slide-up">Slide up</option><option value="zoom">Zoom in</option><option value="float">Float in</option></select></div><div class="lc-field"><label>Animation duration</label><input id="lc-duration" type="range" min="200" max="2500" step="50" value="${config.duration}"><span id="lc-durationv">${config.duration}ms</span></div></div><div class="lc-preview"><img id="lc-preview-img" src="${config.logo||''}" alt="Logo preview"></div><div class="lc-status" aria-live="polite"></div><div class="lc-actions"><button id="lc-close" type="button">Cancel</button><button id="lc-save" class="primary" type="button">Save changes</button></div></div>`;
      document.body.appendChild(modal);
      const $=s=>modal.querySelector(s),anim=$('#lc-anim'); anim.value=config.animation;
      const sync=()=>{const x=Number($('#lc-x').value),y=Number($('#lc-y').value),size=Number($('#lc-size').value),duration=Number($('#lc-duration').value);$('#lc-xv').textContent=`${x}%`;$('#lc-yv').textContent=`${y}%`;$('#lc-sizev').textContent=`${size}px`;$('#lc-durationv').textContent=`${duration}ms`;const p=$('#lc-preview-img');p.style.setProperty('--x',`${x}%`);p.style.setProperty('--y',`${y}%`);p.style.setProperty('--size',`${size}px`);p.style.setProperty('--duration',`${duration}ms`);p.style.setProperty('--anim',animationName(anim.value));p.style.animation='none';void p.offsetWidth;p.style.animation=''};
      modal.querySelectorAll('input[type=range],select').forEach(el=>el.addEventListener('input',sync));
      $('#lc-file').addEventListener('change',()=>{const file=$('#lc-file').files?.[0];if(file)$('#lc-preview-img').src=URL.createObjectURL(file)});
      $('#lc-close').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};sync();
      $('#lc-save').onclick=async()=>{const status=$('.lc-status');try{$('#lc-save').disabled=true;status.textContent='Saving…';let logo=config.logo;const file=$('#lc-file').files?.[0];if(file){const form=new FormData();form.append('file',file);form.append('folder','branding');const response=await fetch('/api/admin/logo/upload',{method:'POST',credentials:'same-origin',body:form});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Logo upload failed');logo=data.logo}const next={logo,x:Number($('#lc-x').value),y:Number($('#lc-y').value),size:Number($('#lc-size').value),animation:anim.value,duration:Number($('#lc-duration').value)};await saveConfig(next);await renderHome(next);status.textContent='Saved successfully.';setTimeout(()=>modal.remove(),350)}catch(error){status.textContent=error?.message||'Could not save';$('#lc-save').disabled=false}};
    });
  }

  function ensureAdminButton(){
    const admin=document.querySelector('.admin-clean');
    const nav=admin?.querySelector('.adminnav');
    if(!admin||!nav)return;
    // Remove any older/incorrect copies from the admin bar.
    admin.querySelectorAll('.adminbar .logo-control-button').forEach(button=>button.remove());
    let button=nav.querySelector('.logo-control-button');
    if(!button){button=document.createElement('button');button.type='button';button.className='logo-control-button';button.textContent='Logo Controls';button.addEventListener('click',openControls);const categories=Array.from(nav.querySelectorAll('button')).find(x=>x.textContent.trim()==='Categories');if(categories)categories.insertAdjacentElement('afterend',button);else nav.appendChild(button);}
  }

  async function refresh(){ensureAdminButton();if(document.querySelector('.hero')){const config=await getConfig();await renderHome({...DEFAULTS,...(config||{})})}}
  const observer=new MutationObserver(()=>ensureAdminButton());observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',refresh);setTimeout(refresh,600);
})();