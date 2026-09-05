(() => {
  const ADMIN_EMAIL = 'admin@safa.local';

  const cleanFooter = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (/Beauty,\s*refined\.?/i.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/Beauty,\s*refined\.?/gi, '');
      }
      node.nodeValue = node.nodeValue
        .replace(/(^|\s)Instagram ↗/g, '$1📷 Instagram ↗')
        .replace(/(^|\s)Facebook ↗/g, '$1ⓕ Facebook ↗')
        .replace(/(^|\s)WhatsApp 01044665050 ↗/g, '$1💬 WhatsApp 01044665050 ↗')
        .replace(/(^|\s)TikTok ↗/g, '$1🎵 TikTok ↗');
    });
  };

  const removeViewAll = () => {
    document.querySelectorAll('a,button').forEach(el => {
      const text = el.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      if (text === 'VIEW ALL ↗' || text === 'VIEW ALL↗') el.remove();
    });
  };

  const setupAdminLogin = () => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const password = form.querySelector('input[type="password"]');
      const email = form.querySelector('input[type="email"], input[name="email"]');
      if (!password || !email || form.dataset.safaCodeLogin === '1') return;

      form.dataset.safaCodeLogin = '1';
      email.style.display = 'none';
      email.setAttribute('aria-hidden', 'true');
      email.disabled = true;

      const emailLabel = form.querySelector(`label[for="${email.id}"]`);
      if (emailLabel) emailLabel.style.display = 'none';

      const passwordLabel = form.querySelector(`label[for="${password.id}"]`);
      if (passwordLabel) passwordLabel.textContent = 'Access code';
      password.placeholder = 'Enter access code';
      password.autocomplete = 'current-password';

      const submit = form.querySelector('button[type="submit"], button:not([type])');
      if (submit) submit.textContent = 'ENTER ↗';

      form.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const code = password.value.trim();
        if (!code) {
          password.focus();
          return;
        }

        if (submit) {
          submit.disabled = true;
          submit.textContent = 'ENTERING…';
        }

        try {
          const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: code })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.token) throw new Error(data.error || 'Invalid access code');
          localStorage.setItem('safaAdminToken', data.token);
          window.location.reload();
        } catch (error) {
          if (submit) {
            submit.disabled = false;
            submit.textContent = 'ENTER ↗';
          }
          let message = form.querySelector('.safa-login-error');
          if (!message) {
            message = document.createElement('p');
            message.className = 'safa-login-error';
            message.style.marginTop = '10px';
            message.style.color = '#8a1f2d';
            form.appendChild(message);
          }
          message.textContent = 'Invalid access code.';
        }
      }, true);
    });
  };

  const sync = () => {
    cleanFooter();
    removeViewAll();
    setupAdminLogin();
  };

  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
})();
