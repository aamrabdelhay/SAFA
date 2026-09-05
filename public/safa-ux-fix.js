(() => {
  const STYLE_ID = 'safa-ux-fix-style';
  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .checkout-actions{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;margin-top:24px}
      .checkout-actions>button{appearance:none;border:1px solid rgba(184,134,11,.35);background:#fffdf8;color:#211f1b;min-height:50px;padding:0 22px;border-radius:2px;letter-spacing:1.3px;font-size:10px;font-weight:600;transition:all .2s ease}
      .checkout-actions>button:hover{background:#f7efe0;border-color:#b8860b;transform:translateY(-1px)}
      .checkout-actions>.goldbtn{flex:1;min-width:220px;border-color:#b8860b;background:#b8860b;color:#fff}
      .checkout-actions>.goldbtn:hover{background:#211f1b;border-color:#211f1b}
      .order-recommendations{margin-top:34px;padding-top:28px;border-top:1px solid rgba(33,31,27,.1)}
      .recommendation-card{background:#fffdf8;border:1px solid rgba(33,31,27,.08);padding:0 0 16px;box-shadow:0 8px 25px rgba(33,31,27,.04)}
      .recommendation-image{background:#f3eee5}
      .recommendation-card .eyebrow,.recommendation-card h3,.recommendation-card .price{margin-left:16px;margin-right:16px}
      .recommendation-add{margin:0 16px;width:calc(100% - 32px);appearance:none;border:1px solid #d8c08a;background:#fff;color:#211f1b;min-height:44px;padding:0 14px;font-size:10px;letter-spacing:1.1px;font-weight:600;cursor:pointer;transition:all .2s ease}
      .recommendation-add:hover{background:#211f1b;color:#fff;border-color:#211f1b}
      .recommendation-add span{float:right}
      .adminnav button[data-safa-categories]{border:1px solid #d8c08a;background:#fffdf8}
      .adminnav button[data-safa-categories].active{background:#211f1b;color:#fff}
      .safa-cat-panel button,.safa-cat-actions button{border:1px solid rgba(33,31,27,.18);background:#fffdf8;color:#211f1b;padding:10px 14px;border-radius:2px;font-size:10px;letter-spacing:.08em}
      .safa-cat-panel button:hover,.safa-cat-actions button:hover{border-color:#b8860b}
      @media(max-width:700px){
        .checkout-actions{display:grid;grid-template-columns:1fr}
        .checkout-actions>.goldbtn{min-width:0}
      }
    `;
    document.head.appendChild(style);
  };
  const tagCategoryTab = () => {
    const btn = [...document.querySelectorAll('.adminnav button')].find(b => b.textContent.trim().toLowerCase() === 'categories');
    if (btn) btn.dataset.safaCategories = '1';
  };
  injectStyle();
  tagCategoryTab();
  new MutationObserver(() => { injectStyle(); tagCategoryTab(); }).observe(document.documentElement,{childList:true,subtree:true});
})();
