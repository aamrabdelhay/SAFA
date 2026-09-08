const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const rateBuckets = new Map();

function getClientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || 'unknown');
}

function allowed(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS;
}

const normalize = (value) => String(value || '').trim().toLowerCase();

function aliases(value) {
  const map = {
    oily: ['oily', 'دهني', 'دهنية'],
    dry: ['dry', 'جاف', 'جافة'],
    combination: ['combination', 'مختلط', 'مختلطة'],
    normal: ['normal', 'عادي', 'عادية'],
    curly: ['curly', 'كيرلي', 'مجعد', 'مجعدة'],
    wavy: ['wavy', 'ويفي', 'مموج', 'مموجة'],
    straight: ['straight', 'مفرود', 'مستقيم'],
    blonde: ['blonde', 'أشقر', 'شقراء'],
    highlighted: ['highlighted', 'هايلايت', 'ملون', 'ملونة', 'مصبوغ', 'مصبوغة'],
  };
  return map[normalize(value)] || [String(value || '')];
}

function categoryAliases(value) {
  const map = {
    skin: ['skin', 'skincare', 'face', 'beauty', 'بشرة', 'عناية بالبشرة'],
    hair: ['hair', 'hair care', 'شعر', 'العناية بالشعر'],
    body: ['body', 'body care', 'جسم', 'العناية بالجسم'],
  };
  return map[normalize(value)] || [String(value || '')];
}

async function searchProducts(filters = {}) {
  const args = [];
  const where = ["p.active = true"];
  const category = normalize(filters.category);

  if (category) {
    args.push(categoryAliases(category).map((x) => `%${x}%`));
    const i = args.length;
    where.push(`(lower(coalesce(c.name_en, '')) LIKE ANY($${i}) OR lower(coalesce(c.name_ar, '')) LIKE ANY($${i}))`);
  }

  const addTextFilter = (patterns) => {
    const clean = [...new Set(patterns.flatMap((p) => aliases(p)).filter(Boolean))].slice(0, 8);
    if (!clean.length) return;
    const clauses = clean.map((pattern) => {
      args.push(`%${pattern}%`);
      const i = args.length;
      return `(lower(coalesce(p.name_en, '')) like lower($${i})
        or lower(coalesce(p.name_ar, '')) like lower($${i})
        or lower(coalesce(p.description_en, '')) like lower($${i})
        or lower(coalesce(p.description_ar, '')) like lower($${i})
        or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where lower(t) like lower($${i})))`;
    });
    where.push(`(${clauses.join(' or ')})`);
  };

  if (filters.skinType) addTextFilter([filters.skinType]);
  if (filters.hairType) addTextFilter([filters.hairType]);
  if (filters.hairColor) addTextFilter([filters.hairColor]);
  if (filters.query) addTextFilter(String(filters.query).split(/\s+/).filter(Boolean).slice(0, 5));

  const priceExpr = `greatest(0, round((p.price - case when p.discount_type='percent' then p.price*coalesce(p.discount_value,0)/100 when p.discount_type='fixed' then coalesce(p.discount_value,0) else 0 end)::numeric, 2))`;
  const maxPrice = Number(filters.maxPrice || 0);
  if (maxPrice > 0) {
    args.push(maxPrice);
    where.push(`${priceExpr} <= $${args.length}`);
  }

  const sql = `
    select
      p.id,
      p.name_en,
      p.name_ar,
      p.price,
      p.discount_type,
      p.discount_value,
      p.description_en,
      p.description_ar,
      p.tags,
      c.name_en as category_en,
      ${priceExpr} as final_price,
      coalesce((select pi.url from product_images pi where pi.product_id=p.id order by pi.position, pi.id limit 1), '') as image
    from products p
    left join categories c on c.id=p.category_id
    where ${where.join(' and ')}
    order by p.featured desc, p.bestseller desc, p.created_at desc
    limit 5
  `;

  console.log('[beauty-advisor] search_products input:', JSON.stringify(filters));
  const rows = (await pool.query(sql, args)).rows;
  console.log('[beauty-advisor] search_products result count:', rows.length);

  return rows.map((p) => ({
    id: p.id,
    name: p.name_en,
    name_ar: p.name_ar,
    category: p.category_en,
    price: Number(p.price),
    final_price: Number(p.final_price),
    discount_active: p.discount_type !== 'none' && Number(p.discount_value || 0) > 0,
    discount_type: p.discount_type,
    discount_value: Number(p.discount_value || 0),
    description: p.description_en || p.description_ar || '',
    image: p.image || '',
  }));
}

const SYSTEM_PROMPT = `
أنت مساعد الجمال الذكي لمتجر SAFA & More.
اتكلمي مع العميلة باللهجة المصرية بشكل لطيف وراقي، بدون مبالغة أو ادعاءات طبية.
هدفك مساعدة العميلة تختار من منتجات SAFA الموجودة فعلًا في قاعدة البيانات.

قواعد أساسية:
1) اسألي سؤالًا واحدًا فقط في كل رسالة أثناء جمع المعلومات.
2) ابدئي عادةً بمعرفة هل الاحتياج للبشرة أم الشعر أم الجسم، ثم اسألي عن التفاصيل الضرورية فقط.
3) لا تقترحي أي منتج إلا بعد استخدام أداة search_products.
4) ممنوع اختراع اسم منتج أو سعر أو عرض أو خصائص غير موجودة في نتيجة الأداة.
5) لو الأداة لم تُرجع منتجات مطابقة، قولي بصراحة إن مفيش منتج مطابق حاليًا واقترحي تعديل البحث بسؤال واحد.
6) عند وجود نتيجة مناسبة، اذكري الاسم والسعر النهائي، ولو فيه خصم اذكري أن عليه عرضًا، ويمكن ذكر السعر الأصلي فقط لو موجود في نتيجة الأداة.
7) لا تقدمي تشخيصًا طبيًا أو علاجًا لمرض جلدي/فروة الرأس. لو السؤال طبي بحت، اكتفي بنصيحة عامة بزيارة مختص.
8) خلي الإجابات قصيرة وواضحة ومناسبة لشات متجر إلكتروني.
`;

const TOOLS = [
  {
    name: 'search_products',
    description: 'يبحث في منتجات SAFA الحقيقية داخل قاعدة البيانات ولا يعيد إلا المنتجات المطابقة للفلاتر.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'كلمات إضافية للبحث في اسم أو وصف أو tags المنتج' },
        category: { type: 'string', enum: ['skin', 'hair', 'body'] },
        skinType: { type: 'string' },
        hairType: { type: 'string' },
        hairColor: { type: 'string' },
        maxPrice: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
];

async function callClaude(messages) {
  const apiKeyPresent = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  console.log('[beauty-advisor] ANTHROPIC_API_KEY present:', apiKeyPresent);
  if (!apiKeyPresent) {
    throw new Error('المفتاح مش موجود: ANTHROPIC_API_KEY');
  }

  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  };

  console.log('[beauty-advisor] sending Claude request:', JSON.stringify({
    model: payload.model,
    messageCount: messages.length,
    toolCount: payload.tools.length,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  console.log('[beauty-advisor] Claude HTTP status:', response.status);

  if (!response.ok) {
    console.error('[beauty-advisor] Claude API error body:', raw.slice(0, 1200));
    throw new Error(`Claude API error: ${raw.slice(0, 1200)}`);
  }

  const data = JSON.parse(raw);
  console.log('[beauty-advisor] Claude response:', JSON.stringify({
    stop_reason: data.stop_reason,
    contentTypes: Array.isArray(data.content) ? data.content.map((b) => b.type) : [],
  }));
  return data;
}

module.exports = async function beautyAdvisor(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  console.log('[beauty-advisor] request received:', JSON.stringify({ method: req.method, hasBody: Boolean(req.body) }));

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed(req)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error('[beauty-advisor] ANTHROPIC_API_KEY is missing');
    return res.status(503).json({ error: 'المفتاح مش موجود: ANTHROPIC_API_KEY' });
  }

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length || messages.length > 30) {
      console.error('[beauty-advisor] invalid conversation:', JSON.stringify({ isArray: Array.isArray(req.body?.messages), count: messages.length }));
      return res.status(400).json({ error: 'Invalid conversation' });
    }

    let conversation = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
    }));

    console.log('[beauty-advisor] normalized conversation:', JSON.stringify({ count: conversation.length, roles: conversation.map((m) => m.role) }));

    let data = await callClaude(conversation);
    const recommendedProducts = new Map();

    for (let loop = 0; loop < 4 && data.stop_reason === 'tool_use'; loop += 1) {
      const toolBlocks = data.content.filter((b) => b.type === 'tool_use');
      console.log('[beauty-advisor] tool loop:', JSON.stringify({ loop, toolBlocks: toolBlocks.length }));
      const toolResults = [];

      for (const block of toolBlocks) {
        const products = block.name === 'search_products' ? await searchProducts(block.input || {}) : [];
        for (const product of products) recommendedProducts.set(String(product.id), product);
        console.log('[beauty-advisor] tool result:', JSON.stringify({ name: block.name, tool_use_id: block.id, resultCount: products.length }));
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(products),
        });
      }

      conversation = [
        ...conversation,
        { role: 'assistant', content: data.content },
        { role: 'user', content: toolResults },
      ];

      console.log('[beauty-advisor] sending tool_result back to Claude:', JSON.stringify({ resultBlocks: toolResults.length }));
      data = await callClaude(conversation);
    }

    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const products = Array.from(recommendedProducts.values()).slice(0, 5);
    console.log('[beauty-advisor] final response:', JSON.stringify({ replyPreview: reply.slice(0, 300), productCount: products.length, stop_reason: data.stop_reason }));

    return res.status(200).json({
      reply: reply || 'معلش، مش عرفت أوصلك لأفضل اختيار دلوقتي. قوليلي احتياجك وأنا أساعدك خطوة خطوة.',
      products,
    });
  } catch (error) {
    console.error('[beauty-advisor] request failed:', error);
    return res.status(500).json({ error: error.message || 'حصل خطأ أثناء تشغيل مساعد الجمال.' });
  }
};
