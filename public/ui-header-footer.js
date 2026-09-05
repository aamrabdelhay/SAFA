(() => {
  const ADMIN_EMAIL = 'admin@safa.local';
  const CATEGORY_NAMES = new Set(['01','02','03','04','05','06','07','4','CLINIQUE','CUROLOGY','SKINCARE','FACE CARE','HAIR CARE','BODY CARE','LIP CARE']);

  const removeFooterCategories = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.querySelectorAll('a, li, p, span, div').forEach(el => {
      const text = el.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      if (!CATEGORY_NAMES.has(text)) return;
      const parent = el.parentElement;
      if (parent && parent !== footer && parent.children.length <= 1) parent.remove();
      else el.remove();
    });
  };

  const styleSocialIcons = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.querySelectorAll('a').forEach(link => {
      const text = link.textContent.replace(/\s+/g, ' ').trim();
      const key = text.replace(/\s*↗\s*$/, '').replace(/\s*01044665050\s*$/, '').trim().toLowerCase();
      const map = { instagram: 'ig', facebook: 'f', whatsapp: 'wa', tiktok: 'tk' };
      const icon = map[key];
      if (!icon) return;
      link.querySelectorAll('.safa-social-icon').forEach(x => x.remove());
      const span = document.createElement('span');
      span.className = `safa-social-icon safa-social-${icon}`;
      span.setAttribute('aria-hidden', 'true');
      span.textContent = icon === 'ig' ? '◎' : icon === 'f' ? 'f' : icon === 'wa' ? '◌' : '♪';
      link.prepend(span);
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.gap = '8px';
    });
  };

  const injectStyles = () => {
    if (document.getElementById('safa-luxury-ui')) return;
    const style = document.createElement('style');
    style.id = 'safa-luxury-ui';
    style.textContent = `
      .safa-social-icon{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;border:1px solid currentColor;border-radius:50%;font:500 12px/1 Georgia,serif;letter-spacing:0;opacity:.82}
      .safa-social-f{font-family:Arial,sans-serif;font-weight:600;font-size:13px}
      .safa-social-wa{font-size:14px}
      .safa-social-tk{font-size:13px}
      .safa-category-menu{position:fixed;inset:76px 6vw auto;z-index:9998;background:#faf8f2;border:1px solid rgba(33,31,27,.14);box-shadow:0 24px 70px rgba(20,18,15,.16);padding:28px;display:none}
      .safa-category-menu.is-open{display:block}
      .safa-category-menu-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:20px}
      .safa-category-menu-head p{margin:0;font:600 10px/1 Manrope,Arial,sans-serif;letter-spacing:2px;color:#8a6a3a}
      .safa-category-menu-head h2{margin:7px 0 0;font:400 30px/1.1 'Cormorant Garamond',Georgia,serif}
      .safa-category-menu-close{border:0;background:none;font:400 22px/1 Georgia,serif;cursor:pointer}
      .safa-category-menu .catgrid{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
      .safa-category-menu .cat{min-height:190px;cursor:pointer}
      @media(max-width:1000px){.safa-category-menu .catgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.safa-category-menu{inset:70px 3vw auto}}
      @media(max-width:650px){.safa-category-menu .catgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.safa-category-menu{inset:62px 14px auto;padding:18px;max-height:calc(100vh - 80px);overflow:auto}}
    `;
    document.head.appendChild(style);
  };

  const openCategoryMenu = () => {
    let menu = document.querySelector('.safa-category-menu');
    if (menu) { menu.classList.add('is-open'); return; }
    const source = document.querySelector('.category-photo-grid');
    if (!source) return;
    menu = document.createElement('div');
    menu.className = 'safa-category-menu is-open';
    menu.innerHTML = '<div class="safa-category-menu-head"><div><p>SAFA / CATEGORIES</p><h2>Categories</h2></div><button class="safa-category-menu-close" aria-label="Close categories">×</button></div>';
    const grid = source.cloneNode(true);
    grid.classList.add('safa-category-menu-grid');
    menu.appendChild(grid);
    menu.querySelector('.safa-category-menu-close').addEventListener('click', () => menu.classList.remove('is-open'));
    grid.querySelectorAll('.cat').forEach(card => card.addEventListener('click', () => menu.classList.remove('is-open')));
    document.body.appendChild(menu);
  };

  const setupCategoryHeader = () => {
    document.querySelectorAll('header a, header button, nav a').forEach(el => {
      const text = el.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      if (text !== 'CATEGORIES') return;
      if (el.dataset.safaCategories === '1') return;
      el.dataset.safaCategories = '1';
      el.textContent = 'SAFA / CATEGORIES';
      el.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openCategoryMenu();
      }, true);
    });
  };

  const removeViewAll = () => {
    document.querySelectorAll('a,button').forEach(el => {
      const text = el.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      if (text === 'VIEW ALL ↗' || text === 'VIEW ALL↗') el.remove();
    });
  };

  const setupAdminLogin = () => {
    document.querySelectorAll('form').forEach(form => {
      const password = form.querySelector('input[type="password"]');
      const email = form.querySelector('input[type="email"], input[name="email"]');
      if (!password || !email || form.dataset.safaCodeLogin === '1') return;
      form.dataset.safaCodeLogin = '1';
      email.style.display = 'none';
      email.disabled = true;
      const label = form.querySelector(`label[for="${password.id}"]`);
      if (label) label.textContent = 'Access code';
      password.placeholder = 'Enter access code';
      password.autocomplete = 'current-password';
      const submit = form.querySelector('button[type="submit"], button:not([type])');
      if (submit) submit.textContent = 'ENTER ↗';
      form.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const code = password.value.trim();
        if (!code) return password.focus();
        if (submit) { submit.disabled = true; submit.textContent = 'ENTERING…'; }
        try {
          const response = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:ADMIN_EMAIL,password:code}) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.token) throw new Error(data.error || 'Invalid access code');
          localStorage.setItem('safaAdminToken', data.token);
          window.location.reload();
        } catch (error) {
          if (submit) { submit.disabled = false; submit.textContent = 'ENTER ↗'; }
          let message = form.querySelector('.safa-login-error');
          if (!message) { message = document.createElement('p'); message.className='safa-login-error'; message.style.marginTop='10px'; message.style.color='#8a1f2d'; form.appendChild(message); }
          message.textContent = 'Invalid access code.';
        }
      }, true);
    });
  };

  const sync = () => { injectStyles(); removeFooterCategories(); styleSocialIcons(); setupCategoryHeader(); removeViewAll(); setupAdminLogin(); };
  sync();
  new MutationObserver(sync).observe(document.body, { childList:true, subtree:true });
})();
