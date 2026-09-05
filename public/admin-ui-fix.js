/* SAFA admin UI fix v2 */
(() => {
  const hideDashboardBranding = () => {
    document.querySelectorAll('.admin .admin-title h1').forEach(el => {
      if (/^Good morning\.?$/i.test(el.textContent.trim())) el.textContent = 'Dashboard';
    });
    document.querySelectorAll('.admin .add-logo').forEach(el => el.remove());
  };

  const stabilizeAdminUI = () => {
    hideDashboardBranding();
    document.querySelectorAll('.adminnav button').forEach(button => {
      button.style.pointerEvents = 'auto';
      button.style.position = 'relative';
      button.style.zIndex = '3';
    });
    document.querySelectorAll('.admin .modal').forEach(modal => {
      modal.style.display = 'grid';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';
      modal.style.zIndex = '9999';
      const form = modal.querySelector('.productform');
      if (form) {
        form.style.display = 'block';
        form.style.visibility = 'visible';
        form.style.opacity = '1';
        form.style.background = '#faf8f2';
        form.style.color = '#211f1b';
      }
    });
  };

  if (!document.getElementById('safa-admin-ui-fix-style')) {
    const style = document.createElement('style');
    style.id = 'safa-admin-ui-fix-style';
    style.textContent = `
      .admin .modal { display:grid !important; visibility:visible !important; opacity:1 !important; z-index:9999 !important; }
      .admin .modal .productform { display:block !important; visibility:visible !important; opacity:1 !important; background:#faf8f2 !important; color:#211f1b !important; }
      .adminnav button { pointer-events:auto !important; position:relative !important; z-index:3 !important; }
      .admin .add-logo { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  const observer = new MutationObserver(stabilizeAdminUI);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  stabilizeAdminUI();
})();
