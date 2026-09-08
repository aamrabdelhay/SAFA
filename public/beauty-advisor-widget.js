(() => {
  const style = document.createElement('style');
  style.textContent = `
    .safa-ai-wrap{position:fixed;left:22px;bottom:22px;z-index:2147483000;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;direction:rtl}
    .safa-ai-bubble{position:absolute;left:0;bottom:74px;background:#faf8f2;color:#3a352c;border:1px solid #e4ddcf;border-radius:14px;padding:9px 14px;font-size:13px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.1);opacity:0;transform:translateY(8px);pointer-events:none}
    .safa-ai-bubble.show{animation:safaAiFade .45s ease forwards}
    @keyframes safaAiFade{to{opacity:1;transform:translateY(0)}}
    .safa-ai-btn{width:62px;height:62px;border-radius:50%;border:1px solid #e1d8ca;background:#faf8f2;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.14);transition:.2s ease;animation:safaAiFloat 3.5s ease-in-out infinite}
    .safa-ai-btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.18)}
    @keyframes safaAiFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
    .safa-ai-btn svg{width:31px;height:31px}
    .safa-ai-panel{position:absolute;left:0;bottom:76px;width:min(360px,calc(100vw - 30px));height:min(560px,calc(100vh - 110px));background:#faf8f2;border:1px solid #e1d8ca;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;display:flex;flex-direction:column;color:#312d26}
    .safa-ai-head{padding:16px 17px;border-bottom:1px solid #e7dfd2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.5)}
    .safa-ai-title{display:flex;align-items:center;gap:10px}
    .safa-ai-avatar{width:34px;height:34px;border-radius:50%;background:#f1ebdf;display:grid;place-items:center;border:1px solid #e2d8c8}
    .safa-ai-head strong{font-size:14px}
    .safa-ai-head small{display:block;color:#8a8272;margin-top:2px;font-size:11px}
    .safa-ai-close{border:0;background:transparent;color:#8a8272;font-size:18px;cursor:pointer;padding:4px}
    .safa-ai-body{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:11px;scroll-behavior:smooth}
    .safa-ai-msg{max-width:86%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.65;white-space:pre-wrap}
    .safa-ai-msg.ai{align-self:flex-start;background:#f1ebdf;color:#3a352c;border-top-right-radius:5px}
    .safa-ai-msg.user{align-self:flex-end;background:#b5586f;color:#fff3f6;border-top-left-radius:5px}
    .safa-ai-products{display:flex;flex-direction:column;gap:8px;max-width:92%;align-self:flex-start}
    .safa-ai-product{display:grid;grid-template-columns:56px 1fr;gap:9px;padding:9px;border:1px solid #e5ddd0;border-radius:13px;background:#fff}
    .safa-ai-product img{width:56px;height:56px;object-fit:cover;border-radius:10px;background:#f1ebdf}
    .safa-ai-product-name{font-size:12.5px;font-weight:600;line-height:1.4}
    .safa-ai-product-cat{font-size:10px;color:#8a8272;margin-top:2px}
    .safa-ai-product-price{font-size:12px;font-weight:600;margin-top:5px}
    .safa-ai-product-price del{color:#a79f92;margin-right:5px;font-weight:400}
    .safa-ai-typing{display:inline-flex;gap:4px;align-items:center}
    .safa-ai-dot{width:5px;height:5px;border-radius:50%;background:#a69b89;animation:safaAiDot 1s infinite alternate}
    .safa-ai-dot:nth-child(2){animation-delay:.15s}.safa-ai-dot:nth-child(3){animation-delay:.3s}
    @keyframes safaAiDot{to{opacity:.25;transform:translateY(-2px)}}
    .safa-ai-foot{border-top:1px solid #e7dfd2;padding:10px;display:flex;gap:8px;background:#fff}
    .safa-ai-input{flex:1;min-width:0;border:1px solid #e0d7c9;border-radius:12px;padding:10px 11px;font-size:13px;background:#fff;outline:none;direction:rtl}
    .safa-ai-input:focus{border-color:#b5586f;box-shadow:0 0 0 3px rgba(181,88,111,.08)}
    .safa-ai-send{border:0;background:#b5586f;color:#fff;border-radius:12px;padding:0 15px;font-size:12px;cursor:pointer}
    .safa-ai-send:disabled{opacity:.5;cursor:default}
    @media (max-width:640px){.safa-ai-wrap{left:14px;bottom:14px}.safa-ai-panel{width:calc(100vw - 28px);height:min(600px,calc(100vh - 92px));bottom:74px}.safa-ai-btn{width:58px;height:58px}}
    @media (prefers-reduced-motion:reduce){.safa-ai-btn{animation:none}.safa-ai-bubble.show{animation:none;opacity:1;transform:none}}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'safa-ai-wrap';
  wrap.innerHTML = `
    <div class="safa-ai-bubble" aria-hidden="true">I can help you</div>
    <button class="safa-ai-btn" type="button" aria-label="Open SAFA Beauty Advisor" aria-expanded="false">
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" stroke="#b5586f" stroke-width="1.5"/>
        <circle cx="12.5" cy="15" r="1.7" fill="#b5586f"/>
        <circle cx="23.5" cy="15" r="1.7" fill="#b5586f"/>
        <path d="M11.5 21c3.5 3.8 9.5 3.8 13 0" stroke="#b5586f" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  `;
  document.body.appendChild(wrap);

  const bubble = wrap.querySelector('.safa-ai-bubble');
  const openBtn = wrap.querySelector('.safa-ai-btn');
  let opened = false;
  let loading = false;
  const messages = [{ role: 'assistant', content: 'أهلًا! أنا مساعد SAFA للجمال ✨ محتاجة حاجة للبشرة، الشعر، ولا الجسم؟' }];

  const panel = document.createElement('div');
  panel.className = 'safa-ai-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="safa-ai-head">
      <div class="safa-ai-title">
        <div class="safa-ai-avatar">✦</div>
        <div><strong>SAFA Beauty Advisor</strong><small>مساعدة ذكية لاختيار المنتجات</small></div>
      </div>
      <button class="safa-ai-close" type="button" aria-label="Close">×</button>
    </div>
    <div class="safa-ai-body"></div>
    <form class="safa-ai-foot">
      <input class="safa-ai-input" autocomplete="off" placeholder="اكتبي احتياجك هنا..." aria-label="Message" />
      <button class="safa-ai-send" type="submit">إرسال</button>
    </form>
  `;
  wrap.appendChild(panel);

  const body = panel.querySelector('.safa-ai-body');
  const input = panel.querySelector('.safa-ai-input');
  const form = panel.querySelector('.safa-ai-foot');
  const send = panel.querySelector('.safa-ai-send');
  const close = panel.querySelector('.safa-ai-close');

  function renderProductCards(products) {
    if (!Array.isArray(products) || !products.length) return;
    const box = document.createElement('div');
    box.className = 'safa-ai-products';
    products.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'safa-ai-product';
      const finalPrice = Number(p.final_price || p.price || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 });
      const original = Number(p.price || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 });
      card.innerHTML = `
        ${p.image ? `<img src="${String(p.image).replace(/"/g, '&quot;')}" alt="">` : '<div></div>'}
        <div><div class="safa-ai-product-name"></div><div class="safa-ai-product-cat"></div><div class="safa-ai-product-price"></div></div>
      `;
      card.querySelector('.safa-ai-product-name').textContent = p.name || p.name_ar || 'SAFA product';
      card.querySelector('.safa-ai-product-cat').textContent = p.category || 'SAFA';
      card.querySelector('.safa-ai-product-price').innerHTML = p.discount_active && Number(p.price) > Number(p.final_price) ? `${finalPrice} EGP <del>${original} EGP</del>` : `${finalPrice} EGP`;
      box.appendChild(card);
    });
    body.appendChild(box);
  }

  function render() {
    body.innerHTML = '';
    messages.forEach((m) => {
      const el = document.createElement('div');
      el.className = `safa-ai-msg ${m.role === 'assistant' ? 'ai' : 'user'}`;
      el.textContent = m.content;
      body.appendChild(el);
      if (m.products) renderProductCards(m.products);
    });
    if (loading) {
      const el = document.createElement('div');
      el.className = 'safa-ai-msg ai';
      el.innerHTML = '<span class="safa-ai-typing"><span class="safa-ai-dot"></span><span class="safa-ai-dot"></span><span class="safa-ai-dot"></span></span>';
      body.appendChild(el);
    }
    body.scrollTop = body.scrollHeight;
  }

  function setOpen(value) {
    opened = value;
    panel.hidden = !opened;
    bubble.classList.remove('show');
    openBtn.setAttribute('aria-expanded', String(opened));
    if (opened) {
      render();
      setTimeout(() => input.focus(), 50);
    }
  }

  openBtn.addEventListener('click', () => setOpen(!opened));
  close.addEventListener('click', () => setOpen(false));
  setTimeout(() => { if (!opened) bubble.classList.add('show'); }, 2600);
  bubble.addEventListener('click', () => setOpen(true));

  async function ask() {
    const text = input.value.trim();
    if (!text || loading) return;
    messages.push({ role: 'user', content: text });
    input.value = '';
    loading = true;
    render();
    console.log('[beauty-advisor] frontend sending message:', { messageCount: messages.length });
    try {
      const response = await fetch('/api/beauty-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json().catch(() => ({}));
      console.log('[beauty-advisor] frontend API response:', { status: response.status, ok: response.ok, error: data.error || null });
      if (!response.ok) throw new Error(data.error || 'Request failed');
      messages.push({ role: 'assistant', content: data.reply || 'معلش، حصل خطأ. جربي تاني.', products: data.products || [] });
    } catch (error) {
      console.error('[beauty-advisor] frontend request failed:', error);
      messages.push({ role: 'assistant', content: error.message || 'معلش، حصلت مشكلة وأنا بحاول أساعدك. جربي تاني بعد شوية.' });
    } finally {
      loading = false;
      render();
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); ask(); });
})();
