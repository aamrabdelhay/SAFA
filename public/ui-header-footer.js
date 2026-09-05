(() => {
  const ADMIN_EMAIL = 'admin@safa.local';
  const WHATSAPP = '01044665050';
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

  const svgIcon = (type) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    if (type === 'ig') {
      path.setAttribute('d', 'M7 2.75h10A4.25 4.25 0 0 1 21.25 7v10A4.25 4.25 0 0 1 17 21.25H7A4.25 4.25 0 0 1 2.75 17V7A4.25 4.25 0 0 1 7 2.75Z');
      svg.appendChild(path);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx','12'); circle.setAttribute('cy','12'); circle.setAttribute('r','4.25');
      svg.appendChild(circle);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx','17.5'); dot.setAttribute('cy','6.5'); dot.setAttribute('r','1');
      dot.classList.add('dot'); svg.appendChild(dot);
    } else if (type === 'fb') {
      path.setAttribute('d', 'M13.5 21v-8h2.75l.5-3h-3.25V8.15c0-.87.24-1.65 1.7-1.65h1.75V3.8c-.3-.04-1.2-.1-2.25-.1-2.23 0-3.75 1.36-3.75 3.85V10H8.5v3h2.45v8');
      svg.appendChild(path);
    } else if (type === 'wa') {
      path.setAttribute('d', 'M20.4 3.6A11.75 11.75 0 0 0 12 0.75 11.7 11.7 0 0 0 2 18.55L.8 23.2l4.77-1.18A11.75 11.75 0 0 0 12 23.25h.01A11.75 11.75 0 0 0 20.4 3.6Z');
      svg.appendChild(path);
      const phone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      phone.setAttribute('d', 'M8.4 6.7c.3-.3.75-.35 1.1-.13l1.35.84c.37.23.52.69.35 1.1l-.55 1.28c.58 1.12 1.5 2.04 2.62 2.62l1.28-.55c.41-.17.87-.02 1.1.35l.84 1.35c.22.35.17.8-.13 1.1l-.62.62c-.5.5-1.23.68-1.9.47a10.1 10.1 0 0 1-6.92-6.92c-.21-.67-.03-1.4.47-1.9l.62-.62Z');
      phone.setAttribute('fill','none'); phone.setAttribute('stroke','currentColor'); phone.setAttribute('stroke-width','1.2'); phone.setAttribute('stroke-linejoin','round');
      svg.appendChild(phone);
    } else if (type === 'tk') {
      path.setAttribute('d', 'M14.1 3c.35 2.15 1.57 3.42 3.7 3.75v3.05c-1.15-.04-2.2-.33-3.16-.87v5.42a5.65 5.65 0 1 1-4.89-5.6v3.12a2.55 2.55 0 1 0 1.79 2.44V3h2.56Z');
      svg.appendChild(path);
    }
    return svg;
  };

  const styleSocialIcons = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.querySelectorAll('a').forEach(link => {
      const raw = link.textContent.replace(/\s+/g, ' ').trim();
      const lower = raw.toLowerCase();
      let type = null;
      if (lower.includes('instagram')) type = 'ig';
      else if (lower.includes('facebook')) type = 'fb';
      else if (lower.includes('whatsapp') || raw.includes(WHATSAPP)) type = 'wa';
      else if (lower.includes('tiktok')) type = 'tk';
      if (!type) return;

      const number = raw.match(/01\d{9,10}/)?.[0] || WHATSAPP;
      link.querySelectorAll('.safa-social-icon, .safa-social-label').forEach(x => x.remove());
      const icon = document.createElement('span');
      icon.className = `safa-social-icon safa-social-${type}`;
      icon.appendChild(svgIcon(type));
      link.prepend(icon);

      if (type === 'wa') {
        link.appendChild(document.createTextNode(number));
      } else {
        const label = document.createElement('span');
        label.className = 'safa-social-label';
        label.textContent = type === 'ig' ? 'Instagram' : type === 'fb' ? 'Facebook' : 'TikTok';
        link.appendChild(label);
      }
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.gap = '9px';
      link.style.minWidth = '0';
      link.style.maxWidth = '100%';
    });
  };

  const injectStyles = () => {
    if (document.getElementById('safa-luxury-ui')) return;
    const style = document.createElement('style');
    style.id = 'safa-luxury-ui';
    style.textContent = `
      .safa-social-icon{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 22px;opacity:.82}
      .safa-social-icon svg{width:21px;height:21px;display:block;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}
      .safa-social-icon .dot{fill:currentColor;stroke:none}
      .safa-social-label{min-width:0;white-space:nowrap}
      footer .socials{display:flex!important;flex-wrap:wrap;align-items:flex-start;gap:12px 24px;min-width:0}
      footer .socials a{box-sizing:border-box;min-height:30px;white-space:nowrap;overflow-wrap:anywhere}
      footer a{max-width:100%;overflow-wrap:anywhere}
      .safa-category-menu{position:fixed;inset:76px 6vw auto;z-index:9998;background:#faf8f2;border:1px solid rgba(33,31,27,.14);box-shadow:0 24px 70px rgba(20,18,15,.16);padding:28px;display:none}
      .safa-category-menu.is-open{display:block}
      .safa-category-menu-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:20px}
      .safa-category-menu-head p{margin:0;font:600 10px/1 Manrope,Arial,sans-serif;letter-spacing:2px;color:#8a6a3a}
      .safa-category-menu-head h2{margin:7px 0 0;font:400 30px/1.1 'Cormorant Garamond',Georgia,serif}
      .safa-category-menu-close{border:0;background:none;font:400 22px/1 Georgia,serif;cursor:pointer}
      .safa-category-menu .catgrid{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
      .safa-category-menu .cat{min-height:190px;cursor:pointer}
      @media(max-width:1000px){.safa-category-menu .catgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.safa-category-menu{inset:70px 3vw}}
      @media(max-width:650px){
        .safa-category-menu .catgrid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .safa-category-menu{inset:62px 14px auto;padding:18px;max-height:calc(100vh - 80px);overflow:auto}
        footer{padding:36px 20px 28px!important;overflow:hidden}
        footer .socials{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:10px!important;width:100%!important}
        footer .socials a{width:auto!important;max-width:100%!important;font-size:13px!important;line-height:1.35!important}
        footer .socials a span{max-width:calc(100vw - 100px)}
        footer > *, footer section, footer .footer-grid, footer .footer-inner, footer .footer-content{min-width:0!important;max-width:100%!important}
        footer p, footer li, footer a, footer h2, footer h3{overflow-wrap:anywhere;word-break:normal}
      }
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
