const crypto = require('crypto');
const { Pool } = require('pg');

const MODEL = 'gemini-3.5-flash-lite';
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

function normalizeMessages(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: typeof message.content === 'string' ? message.content.trim().replace(/\s+/g, ' ').slice(0, 4000) : '',
  }));
}

function cacheKeyFor(messages) {
  return crypto.createHash('sha256').update(JSON.stringify(normalizeMessages(messages))).digest('hex');
}

function productFingerprint(products) {
  return crypto.createHash('sha256').update(JSON.stringify(products.map((p) => ({
    id: p.id,
    name: p.name,
    name_ar: p.name_ar,
    category: p.category,
    price: p.price,
    final_price: p.final_price,
    discount_active: p.discount_active,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    description: p.description,
    image: p.image,
  })))).digest('hex');
}

async function readCache(cacheKey) {
  const result = await pool.query(
    'select cache_key, answer, products, tool_filters, data_hashes, is_static from beauty_advisor_cache where cache_key=$1 limit 1',
    [cacheKey]
  );
  return result.rows[0] || null;
}

async function writeCache({ cacheKey, answer, products, toolFilters, dataHashes, isStatic }) {
  await pool.query(
    `insert into beauty_advisor_cache(cache_key, answer, products, tool_filters, data_hashes, is_static, created_at, updated_at)
     values($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,now(),now())
     on conflict(cache_key) do update set
       answer=excluded.answer,
       products=excluded.products,
       tool_filters=excluded.tool_filters,
       data_hashes=excluded.data_hashes,
       is_static=excluded.is_static,
       updated_at=now()`,
    [
      cacheKey,
      answer,
      JSON.stringify(products || []),
      JSON.stringify(toolFilters || []),
      JSON.stringify(dataHashes || []),
      Boolean(isStatic),
    ]
  );
}

async function currentCacheStillValid(cache) {
  if (!cache || cache.is_static) return true;
  const toolFilters = Array.isArray(cache.tool_filters) ? cache.tool_filters : [];
  const dataHashes = Array.isArray(cache.data_hashes) ? cache.data_hashes : [];
  if (toolFilters.length !== dataHashes.length) return false;

  for (let index = 0; index < toolFilters.length; index += 1) {
    const products = await searchProducts(toolFilters[index]);
    if (productFingerprint(products) !== dataHashes[index]) return false;
  }
  return true;
}

function staticReplyFor(message) {
  const text = normalize(message);
  if (!text) return null;

  if (/^(hi|hello|hey|اهلا|أهلا|السلام عليكم|سلام|هاي|هلا)[! .،؟?]*$/u.test(text)) {
    return 'أهلًا! أنا مساعدة SAFA & More. محتاجة حاجة للبشرة، الشعر، ولا الجسم؟';
  }

  if (/^(عايزة حاجة|عاوزه حاجه|محتاجة حاجة|محتاجه حاجه|عايز حاجة|عاوز حاجه|ممكن حاجة|ممكن حاجه)[! .،؟?]*$/u.test(text)) {
    return 'أكيد. محتاجة المنتج للبشرة، الشعر، ولا الجسم؟';
  }

  if (/(برمجة|كود|javascript|python|react|next\.js|html|css|رياضة|كرة|ماتش|سياسة|رئيس|اقتصاد|نكتة|نكت|weather|programming|football|politics|sports|joke)/iu.test(text)) {
    return 'أنا مساعدة بيوتي مش موسوعة عامة 😄 اسأليني عن البشرة أو الشعر أو الجسم أو منتجات وعروض SAFA & More.';
  }

  if (/^(مين انتي|من انتي|مين انت|من انت|ايه اللي بتعمليه|ماذا تفعلين|what can you do|who are you)[! .،؟?]*$/iu.test(text)) {
    return 'أنا Beauty Advisor الخاصة بـSAFA & More، وبساعدك تختاري منتجات مناسبة للبشرة أو الشعر أو الجسم من المنتجات الموجودة فعلًا في الموقع.';
  }

  return null;
}

function categoryAliases(value) {
  const map = {
    skin: ['skin', 'skincare', 'face', 'beauty', 'بشرة', 'العناية بالبشرة'],
    hair: ['hair', 'hair care', 'شعر', 'العناية بالشعر'],
    body: ['body', 'body care', 'جسم', 'العناية بالجسم'],
  };
  const key = normalize(value);
  return map[key] || [String(value || '')];
}

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
  const key = normalize(value);
  return map[key] || [String(value || '')];
}

async function searchProducts(filters = {}) {
  const args = [];
  const where = ['p.active = true'];
  const category = normalize(filters.category);

  if (category) {
    const patterns = categoryAliases(category).map((x) => `%${x}%`);
    args.push(patterns);
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
    id: String(p.id),
    name: p.name_en || p.name_ar || 'SAFA product',
    name_ar: p.name_ar || '',
    category: p.category_en || '',
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
إنتِ مساعدة بيوتي (Beauty Advisor) لموقع SAFA & More.
اتكلمي مع العميلة باللهجة المصرية بشكل لطيف وراقي.
مهمتك الأساسية مساعدتها تختار من منتجات SAFA الموجودة فعلًا في قاعدة البيانات.

القواعد:
1) اسألي سؤال واحد بس في كل رسالة أثناء جمع المعلومات.
2) ابدئي بمعرفة هل الاحتياج للبشرة ولا الشعر ولا الجسم، وبعدها اسألي التفاصيل الضرورية.
3) لازم تستخدمي search_products قبل اقتراح أي منتج.
4) ممنوع اختراع اسم منتج أو سعر أو عرض أو خصائص غير موجودة في نتيجة search_products.
5) لو البحث رجع صفر منتجات، قولي بصراحة مفيش منتج مطابق حاليًا واسألي سؤال متابعة واحد فقط لتعديل البحث.
6) لو لقيتي منتجات مناسبة، اذكري الاسم والسعر النهائي، ولو فيه خصم اذكري إنه عليه عرض.
7) ممنوع التشخيص الطبي أو وصف علاج لمرض جلدي أو مشكلة مرضية في فروة الرأس.
8) خلي الردود قصيرة وواضحة ومناسبة لشات متجر إلكتروني.
9) لو السؤال خارج نطاق الجمال ومنتجات SAFA & More، ردي بخفة دم إنك مساعدة بيوتي مش موسوعة عامة، وارجعي للموضوع بلطف من غير ما تجاوبي السؤال الخارجي.
10) لو طلب العميل منتجًا، استخدمي الأداة أولًا ثم ابني الرد من نتائجها فقط.
`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_products',
        description: 'يبحث في منتجات SAFA الحقيقية داخل قاعدة البيانات ولا يعيد إلا المنتجات المطابقة للفلاتر.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'كلمات إضافية للبحث في اسم أو وصف أو tags المنتج' },
            category: { type: 'string', enum: ['skin', 'hair', 'body'] },
            skinType: { type: 'string' },
            hairType: { type: 'string' },
            hairColor: { type: 'string' },
            maxPrice: { type: 'number' },
          },
        },
      },
    ],
  },
];

async function callGemini(contents) {
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log('[beauty-advisor] GEMINI_API_KEY present:', apiKeyPresent);
  if (!apiKeyPresent) throw new Error('المفتاح مش موجود: GEMINI_API_KEY');

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    tools: TOOLS,
    generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
  };

  console.log('[beauty-advisor] sending Gemini request:', JSON.stringify({
    model: MODEL,
    messageCount: contents.length,
    toolCount: TOOLS.reduce((n, t) => n + t.functionDeclarations.length, 0),
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  console.log('[beauty-advisor] Gemini HTTP status:', response.status);
  if (!response.ok) {
    console.error('[beauty-advisor] Gemini API error body:', raw.slice(0, 2000));
    throw new Error(`Gemini API error: ${raw.slice(0, 2000)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Gemini returned an invalid JSON response');
  }

  const candidate = data.candidates?.[0];
  console.log('[beauty-advisor] Gemini response:', JSON.stringify({
    finishReason: candidate?.finishReason || null,
    partTypes: Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts.map((p) => p.functionCall ? 'functionCall' : p.text ? 'text' : 'other')
      : [],
  }));
  return data;
}

function extractFunctionCalls(candidate) {
  return (candidate?.content?.parts || [])
    .filter((part) => part?.functionCall?.name)
    .map((part) => part.functionCall);
}

module.exports = async function beautyAdvisor(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  console.log('[beauty-advisor] request received:', JSON.stringify({ method: req.method, hasBody: Boolean(req.body) }));
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed(req)) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error('[beauty-advisor] GEMINI_API_KEY is missing');
    return res.status(503).json({ error: 'المفتاح مش موجود: GEMINI_API_KEY' });
  }

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length || messages.length > 30) {
      console.error('[beauty-advisor] invalid conversation:', JSON.stringify({ isArray: Array.isArray(req.body?.messages), count: messages.length }));
      return res.status(400).json({ error: 'المحادثة غير صالحة: ابعتي رسالة واحدة على الأقل وبحد أقصى 30 رسالة.' });
    }

    const normalizedMessages = normalizeMessages(messages);
    const cacheKey = cacheKeyFor(normalizedMessages);
    console.log('[beauty-advisor] cache key:', cacheKey.slice(0, 12));

    const staticReply = normalizedMessages.length === 1 ? staticReplyFor(normalizedMessages[0].content) : null;
    if (staticReply) {
      const cachedStatic = await readCache(cacheKey);
      if (cachedStatic?.answer === staticReply) {
        console.log('[beauty-advisor] cache hit: static');
        return res.status(200).json({ reply: cachedStatic.answer, products: [] , cache: 'hit-static' });
      }
      await writeCache({ cacheKey, answer: staticReply, products: [], toolFilters: [], dataHashes: [], isStatic: true });
      console.log('[beauty-advisor] static response, Gemini skipped');
      return res.status(200).json({ reply: staticReply, products: [], cache: 'static' });
    }

    const cached = await readCache(cacheKey);
    if (cached && await currentCacheStillValid(cached)) {
      const cachedProducts = Array.isArray(cached.products) ? cached.products : [];
      console.log('[beauty-advisor] cache hit: dynamic data unchanged');
      return res.status(200).json({ reply: cached.answer, products: cachedProducts, cache: 'hit-dynamic' });
    }
    if (cached) console.log('[beauty-advisor] cache stale: site data changed, Gemini required');

    let contents = normalizedMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    console.log('[beauty-advisor] normalized conversation:', JSON.stringify({ count: contents.length, roles: contents.map((m) => m.role) }));
    let data = await callGemini(contents);
    const recommendedProducts = new Map();
    const toolFilters = [];
    const dataHashes = [];

    for (let loop = 0; loop < 4; loop += 1) {
      const candidate = data.candidates?.[0];
      const functionCalls = extractFunctionCalls(candidate);
      if (!functionCalls.length) break;

      console.log('[beauty-advisor] tool loop:', JSON.stringify({ loop, functionCalls: functionCalls.length }));
      const functionResponseParts = [];

      for (const call of functionCalls) {
        const filters = call.args || {};
        const products = call.name === 'search_products' ? await searchProducts(filters) : [];

        toolFilters.push(filters);
        dataHashes.push(productFingerprint(products));
        for (const product of products) recommendedProducts.set(String(product.id), product);

        console.log('[beauty-advisor] tool result:', JSON.stringify({ name: call.name, id: call.id || null, resultCount: products.length, fingerprint: productFingerprint(products).slice(0, 12) }));

        const functionResponse = {
          name: call.name,
          response: { result: products },
        };
        if (call.id) functionResponse.id = call.id;
        functionResponseParts.push({ functionResponse });
      }

      contents = [...contents, candidate.content, { role: 'user', parts: functionResponseParts }];
      data = await callGemini(contents);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply = parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n').trim();
    const products = Array.from(recommendedProducts.values()).slice(0, 5);
    const isStatic = toolFilters.length === 0;

    console.log('[beauty-advisor] final response:', JSON.stringify({
      replyPreview: reply.slice(0, 300),
      productCount: products.length,
      finishReason: data.candidates?.[0]?.finishReason || null,
      isStatic,
    }));

    const safeReply = reply || 'معلش، مش عرفت أوصلك لأفضل اختيار دلوقتي. قوليلي احتياجك وأنا أساعدك خطوة خطوة.';
    await writeCache({
      cacheKey,
      answer: safeReply,
      products,
      toolFilters,
      dataHashes,
      isStatic,
    });

    return res.status(200).json({ reply: safeReply, products, cache: 'miss-gemini' });
  } catch (error) {
    console.error('[beauty-advisor] request failed:', error);
    const message = error?.message || 'حصل خطأ أثناء تشغيل مساعد الجمال.';
    return res.status(500).json({
      error: message,
      code: message.startsWith('Gemini API error:') ? 'GEMINI_API_ERROR' : 'BEAUTY_ADVISOR_ERROR',
    });
  }
};
