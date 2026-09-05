(() => {
  // Keep the admin UI clean without interfering with React state or modals.
  const cleanDashboard = () => {
    document.querySelectorAll('.admin .admin-title h1').forEach((el) => {
      if (/^Good morning\.?$/i.test(el.textContent.trim())) el.remove();
    });
    document.querySelectorAll('.admin .add-logo').forEach((el) => el.remove());
  };

  cleanDashboard();
  new MutationObserver(cleanDashboard).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
